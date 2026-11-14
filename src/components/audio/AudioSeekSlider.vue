<template>
  <div class="audio-seek">
    <span v-if="showTime" :class="['audio-seek-time', timeClass]">{{ timeText(shownPosition) }}</span>
    <v-slider
      :class="['audio-seek-slider', sliderClass]"
      :value="shownPosition"
      :max="duration || 1"
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
 */
export default {
  name: 'AudioSeekSlider',

  mixins: [audioCommand],

  props: {
    /** A resolved target (`resolveTarget`), or null. */
    target: { type: Object, default: null },
    disabled: { type: Boolean, default: false },
    showTime: { type: Boolean, default: true },
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
    shownPosition () {
      if (this.seekDragging && this.seekDrag !== null) {
        return this.seekDrag
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
    /** Jumps `seconds` from the shown position; the bar's ±10 buttons call it. */
    skip (seconds) {
      if (!this.seekable) {
        return
      }
      const position = Math.max(0, Math.min(this.duration, Math.round(this.position + seconds)))
      this.hold(position)
      this.seek(position)
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
    seekStart (value) {
      this.seekDragging = true
      this.seekDrag = value
    },
    seekInput (value) {
      if (this.seekDragging) {
        this.seekDrag = value
      }
    },
    seekEnd (value) {
      // Holds the released value even when the drag ended where it began, in
      // which case no `change` follows and nothing is sent.
      this.seekDragging = false
      this.seekDrag = null
      this.hold(value)
    },
    seekChange (value) {
      this.seekDragging = false
      this.seekDrag = null
      this.hold(value)
      this.seek(value)
    },
    timeText (seconds) {
      const s = Math.max(0, Math.floor(seconds || 0))
      return `${Math.floor(s / 60)}:${`${s % 60}`.padStart(2, '0')}`
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
