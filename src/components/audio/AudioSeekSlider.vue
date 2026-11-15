<template>
  <div class="audio-seek">
    <span v-if="showTime" :class="['audio-seek-time', timeClass]">{{ timeText(shownPosition - start) }}</span>
    <v-slider
      :class="['audio-seek-slider', sliderClass]"
      :value="shownPosition - start"
      :max="Math.max(1, end - start)"
      :disabled="!seekable"
      min="0"
      step="1"
      hide-details
      dense
      @start="seekStart"
      @input="seekInput"
      @end="seekEnd"
      @change="seekChange"
    ></v-slider>
  </div>
</template>

<script lang="js">
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'

// How long a released slider keeps its value while no newer state arrives.
const HOLD_MS = 3000

/**
 * The song-position slider of one audio target, shared by the audio bar and
 * the playlist editor's search preview (openspec change
 * `kiosk-search-track-preview`, design D1). The position is interpolated from
 * `elapsed` + `elapsedAt` while the target plays; a drag is not moved back by
 * incoming state, and a released value is held until a state with a new
 * `elapsedAt` arrives, or for HOLD_MS (change `kiosk-audio-player`, D7).
 *
 * With `rangeStart`/`rangeEnd` the slider spans only that part of the track -
 * the current chapter of an audiobook (change `kiosk-audiobooks`, D3): it
 * shows the position within the range and a release seeks to
 * `rangeStart + value`. It emits `position` with the shown position in the
 * whole track whenever that changes outside a drag, so the bar can work out
 * the chapter from the same number the slider shows.
 */
export default {
  name: 'AudioSeekSlider',

  mixins: [audioCommand],

  props: {
    /** A resolved target (`resolveTarget`), or null. */
    target: { type: Object, default: null },
    disabled: { type: Boolean, default: false },
    showTime: { type: Boolean, default: true },
    /** seconds; the part of the track the slider spans, the whole track by default */
    rangeStart: { type: Number, default: null },
    rangeEnd: { type: Number, default: null },
    /** Extra classes for the time and the slider, so a caller keeps its own markup. */
    timeClass: { type: String, default: null },
    sliderClass: { type: String, default: null }
  },

  data: () => ({
    now: Date.now(),
    ticker: null,
    seekDragging: false,
    seekDrag: null,
    seekHeld: null,
    seekHeldAt: null,
    seekHoldTimer: null
  }),

  computed: {
    playback () {
      return this.target ? this.target.playback : null
    },
    track () {
      return this.playback ? this.playback.track : null
    },
    playing () {
      return !!this.playback && this.playback.state === 'playing'
    },
    duration () {
      return this.playback && this.playback.duration ? this.playback.duration : null
    },
    seekable () {
      return !this.disabled && !!this.track && this.duration !== null
    },
    /** The position interpolated from `elapsed` + `elapsedAt` while playing. */
    position () {
      if (!this.playback) {
        return 0
      }
      let position = this.playback.elapsed
      if (this.playing) {
        position += (this.now - this.playback.elapsedAt) / 1000
      }
      return Math.max(0, this.duration !== null ? Math.min(position, this.duration) : position)
    },
    start () {
      return this.rangeStart !== null ? this.rangeStart : 0
    },
    end () {
      if (this.rangeEnd !== null) {
        return this.rangeEnd
      }
      return this.duration || 0
    },
    /** In the whole track; inside the range while one is set. */
    shownPosition () {
      let shown
      if (this.seekDragging && this.seekDrag !== null) {
        shown = this.seekDrag
      } else {
        shown = this.seekHeld !== null ? this.seekHeld : Math.floor(this.position)
      }
      return this.rangeStart !== null ? Math.max(this.start, Math.min(this.end, shown)) : shown
    },
    /** The shown position outside a drag, before it is clamped to the range. */
    reportedPosition () {
      if (this.seekDragging) {
        return null
      }
      return this.seekHeld !== null ? this.seekHeld : Math.floor(this.position)
    }
  },

  watch: {
    playing: {
      immediate: true,
      handler (playing) {
        this.now = Date.now()
        if (playing && this.ticker === null) {
          this.ticker = setInterval(() => { this.now = Date.now() }, 1000)
        } else if (!playing && this.ticker !== null) {
          clearInterval(this.ticker)
          this.ticker = null
        }
      }
    },
    'playback.elapsedAt' (elapsedAt) {
      if (this.seekHeld !== null && elapsedAt !== this.seekHeldAt) {
        this.clearSeekHold()
      }
    },
    'target.key' () {
      this.clearSeekHold()
    },
    reportedPosition: {
      immediate: true,
      handler (position) {
        if (position !== null) {
          this.$emit('position', position)
        }
      }
    }
  },

  methods: {
    seek (position) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      this.runAudioCommand(() => audioService.seek(targetId, position))
    },
    /** Jumps `seconds` from the shown position; the bar's skip buttons call it. */
    skip (seconds) {
      if (!this.seekable) {
        return
      }
      this.seekTo(this.position + seconds)
    },
    /** Seeks to `position` in the whole track, clamped to `0..duration`, and holds it. */
    seekTo (position) {
      if (!this.seekable) {
        return
      }
      const clamped = Math.max(0, Math.min(this.duration, Math.round(position)))
      this.hold(clamped)
      this.seek(clamped)
    },
    hold (position) {
      this.clearSeekHold()
      this.seekHeld = position
      this.seekHeldAt = this.playback ? this.playback.elapsedAt : null
      this.seekHoldTimer = setTimeout(() => this.clearSeekHold(), HOLD_MS)
    },
    clearSeekHold () {
      if (this.seekHoldTimer !== null) {
        clearTimeout(this.seekHoldTimer)
        this.seekHoldTimer = null
      }
      this.seekHeld = null
      this.seekHeldAt = null
    },
    // The slider's values are relative to the range start; everything held or
    // sent is in the whole track.
    seekStart (value) {
      this.seekDragging = true
      this.seekDrag = this.start + value
    },
    seekInput (value) {
      if (this.seekDragging) {
        this.seekDrag = this.start + value
      }
    },
    seekEnd (value) {
      // Holds the released value even when the drag ended where it began, in
      // which case no `change` follows and nothing is sent.
      this.seekDragging = false
      this.seekDrag = null
      this.hold(this.start + value)
    },
    seekChange (value) {
      this.seekDragging = false
      this.seekDrag = null
      this.hold(this.start + value)
      this.seek(this.start + value)
    },
    timeText (seconds) {
      const s = Math.max(0, Math.floor(seconds || 0))
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const ss = `${s % 60}`.padStart(2, '0')
      return h > 0 ? `${h}:${`${m}`.padStart(2, '0')}:${ss}` : `${m}:${ss}`
    }
  },

  beforeDestroy () {
    if (this.ticker !== null) {
      clearInterval(this.ticker)
    }
    this.clearSeekHold()
  }
}
</script>

<style lang="scss">
// The line a list row wraps onto for its slider: the search preview's current
// track and the open playlist's playing track (change
// `kiosk-playlist-track-play`, design D4).
.audio-row-seek-line {
  flex: 0 0 100%;
  min-width: 0;
  padding-bottom: 4px;
  cursor: default;
}

.audio-row-seek {
  display: flex;
  align-items: center;

  .v-input {
    margin: 0;
  }

  .audio-seek-time {
    flex: 0 0 auto;
    min-width: 36px;
    font-size: 12px;
    text-align: right;
    margin-right: 8px;
    font-variant-numeric: tabular-nums;
  }

  .v-slider__thumb {
    width: 18px;
    height: 18px;
    left: -9px;
  }

  .v-slider__thumb::before {
    left: -9px;
    top: -9px;
  }
}
</style>
