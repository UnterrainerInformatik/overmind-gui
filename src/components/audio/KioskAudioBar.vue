<template>
  <v-footer
    app
    fixed
    padless
    :class="['kiosk-audio-player', { 'kiosk-audio-player--unavailable': !available, 'kiosk-audio-player--narrow': narrow }]"
    :style="{ '--kiosk-audio-target-color': targetColor }"
  >
    <v-tooltip top :open-delay="openDelay" :disabled="!tooltips">
      <template v-slot:activator="{ on, attrs }">
        <button
          type="button"
          class="kiosk-audio-player-target"
          :disabled="!available"
          v-bind="attrs"
          v-on="on"
          @click="targetDialog = true"
        >
          <span class="kiosk-audio-player-dot"></span>
          <v-icon small class="kiosk-audio-player-target-icon">{{ target && target.kind === 'room' ? 'speaker' : 'speaker_group' }}</v-icon>
          <span v-if="!narrow" class="kiosk-audio-player-target-name">{{ targetName }}</span>
        </button>
      </template>
      <span>{{ $t('page.kiosk.audio.tooltip.target') }}</span>
    </v-tooltip>

    <button
      type="button"
      class="kiosk-audio-player-title"
      :disabled="!available"
      :title="tooltips ? $t('page.kiosk.audio.tooltip.title') : null"
      @click="queueDialog = true"
    >
      <span class="kiosk-audio-player-title-main">{{ titleText }}</span>
      <span v-if="artistText" class="kiosk-audio-player-title-artist">{{ artistText }}</span>
    </button>

    <v-btn
      v-if="!narrow"
      icon
      class="kiosk-audio-player-btn kiosk-audio-player-previous"
      :disabled="!available"
      :title="tooltips ? $t('page.kiosk.audio.tooltip.previous') : null"
      @click="command('previous')"
    >
      <v-icon>skip_previous</v-icon>
    </v-btn>
    <v-btn
      v-if="!narrow"
      icon
      class="kiosk-audio-player-btn kiosk-audio-player-back10"
      :disabled="!seekable"
      :title="tooltips ? $t('page.kiosk.audio.tooltip.back10') : null"
      @click="skip(-10)"
    >
      <v-icon>replay_10</v-icon>
    </v-btn>
    <v-btn
      icon
      class="kiosk-audio-player-btn kiosk-audio-player-playpause"
      :disabled="!available"
      :title="tooltips ? $t(playing ? 'page.kiosk.audio.tooltip.pause' : 'page.kiosk.audio.tooltip.play') : null"
      @click="command(playing ? 'pause' : 'play')"
    >
      <v-icon>{{ playing ? 'pause' : 'play_arrow' }}</v-icon>
    </v-btn>
    <v-btn
      v-if="!narrow"
      icon
      class="kiosk-audio-player-btn kiosk-audio-player-forward10"
      :disabled="!seekable"
      :title="tooltips ? $t('page.kiosk.audio.tooltip.forward10') : null"
      @click="skip(10)"
    >
      <v-icon>forward_10</v-icon>
    </v-btn>
    <v-btn
      icon
      class="kiosk-audio-player-btn kiosk-audio-player-next"
      :disabled="!available"
      :title="tooltips ? $t('page.kiosk.audio.tooltip.next') : null"
      @click="command('next')"
    >
      <v-icon>skip_next</v-icon>
    </v-btn>

    <div class="kiosk-audio-player-progress" :title="tooltips ? $t('page.kiosk.audio.tooltip.seek') : null">
      <span v-if="!narrow" class="kiosk-audio-player-time">{{ timeText(shownPosition) }}</span>
      <v-slider
        class="kiosk-audio-player-slider"
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

    <v-menu
      top
      offset-y
      :close-on-content-click="false"
      :disabled="!available"
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          icon
          class="kiosk-audio-player-btn kiosk-audio-player-volume"
          :disabled="!available"
          :title="tooltips ? $t('page.kiosk.audio.tooltip.volume') : null"
          v-bind="attrs"
          v-on="on"
        >
          <v-icon>{{ shownVolume === 0 ? 'volume_off' : 'volume_up' }}</v-icon>
        </v-btn>
      </template>
      <v-card class="kiosk-audio-player-volume-menu pa-2">
        <v-slider
          class="kiosk-audio-player-volume-slider"
          vertical
          :value="shownVolume"
          min="0"
          max="100"
          step="1"
          hide-details
          @start="volumeStart"
          @input="volumeInput"
          @end="finishVolume"
          @change="finishVolume"
        ></v-slider>
        <div class="text-center text-caption kiosk-audio-player-volume-value">{{ shownVolume }}</div>
      </v-card>
    </v-menu>

    <v-btn
      icon
      class="kiosk-audio-player-btn kiosk-audio-player-radio"
      :disabled="!available"
      :title="tooltips ? $t('page.kiosk.audio.tooltip.radio') : null"
      @click="radioDialog = true"
    >
      <v-icon>radio</v-icon>
    </v-btn>

    <AudioTargetDialog
      v-model="targetDialog"
      :state="state"
      :selectedKey="target ? target.key : 'main'"
      @select="selectTarget"
    ></AudioTargetDialog>
    <AudioQueueDialog
      v-model="queueDialog"
      :target="target"
    ></AudioQueueDialog>
    <AudioRadioDialog
      v-model="radioDialog"
      :target="target"
    ></AudioRadioDialog>
  </v-footer>
</template>

<script lang="js">
import { mapGetters } from 'vuex'
import { acquire, release } from '@/utils/audioState'
import { singleton as audioService, MAIN_GROUP_COLOR } from '@/utils/webservices/audioService'
import { readStoredTarget, writeStoredTarget, resolveTarget, selectedRoomOf } from '@/utils/audioTarget'
import { audioCommand } from '@/mixins/audioCommand'
import { createLiveSender } from '@/utils/liveSender'
import AudioTargetDialog from '@/components/audio/AudioTargetDialog.vue'
import AudioQueueDialog from '@/components/audio/AudioQueueDialog.vue'
import AudioRadioDialog from '@/components/audio/AudioRadioDialog.vue'

// How long a released slider keeps its value while no newer state arrives.
const HOLD_MS = 3000

/**
 * The music player bar along the bottom of every kiosk page (openspec change
 * `kiosk-audio-player`). It controls one target - the main group or a room that
 * plays on its own - and shows that target's colour. Everything it shows comes
 * from the shared audio state; commands are sent and the next state shows
 * their effect, except for the two sliders, which hold the released value
 * until that state arrives (design.md D7). The volume slider sends its level
 * live while dragged (openspec change `kiosk-live-volume`).
 */
export default {
  name: 'KioskAudioBar',

  mixins: [audioCommand],

  components: {
    AudioTargetDialog,
    AudioQueueDialog,
    AudioRadioDialog
  },

  data: () => ({
    store: null,
    selection: 'main',
    now: Date.now(),
    ticker: null,
    seekDragging: false,
    seekDrag: null,
    seekHeld: null,
    seekHeldAt: null,
    seekHoldTimer: null,
    volumeDragging: false,
    volumeDrag: null,
    volumeHeld: null,
    volumeHoldTimer: null,
    targetDialog: false,
    queueDialog: false,
    radioDialog: false
  }),

  computed: {
    ...mapGetters('gui/tooltips', {
      tooltips: 'tooltips',
      openDelay: 'openDelay'
    }),
    state () {
      return this.store ? this.store.state : null
    },
    available () {
      return !!this.store && this.store.available && !!this.state
    },
    narrow () {
      return this.$vuetify.breakpoint.xsOnly
    },
    selectedRoom () {
      return selectedRoomOf(this.state, this.selection)
    },
    /** The selection resolved against the state: the room while it may be one, else the main group. */
    target () {
      return resolveTarget(this.state, this.selection, this.$t('page.kiosk.audio.mainGroup'))
    },
    /** True once a loaded state has made a remembered room fall back to the main group. */
    selectionFellBack () {
      return !!this.state && this.selection !== 'main' && !this.selectedRoom
    },
    targetName () {
      return this.target ? this.target.name : this.$t('page.kiosk.audio.mainGroup')
    },
    targetColor () {
      return this.target ? this.target.color : MAIN_GROUP_COLOR
    },
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
      return this.available && !!this.track && this.duration !== null
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
    },
    shownVolume () {
      if (this.volumeDragging && this.volumeDrag !== null) {
        return this.volumeDrag
      }
      if (this.volumeHeld !== null) {
        return this.volumeHeld
      }
      return this.target && this.target.volume !== null ? this.target.volume : 0
    },
    titleText () {
      if (!this.available) {
        return this.$t('page.kiosk.audio.unavailable')
      }
      return this.track && this.track.title ? this.track.title : this.$t('page.kiosk.audio.nothingPlaying')
    },
    artistText () {
      return this.available && this.track ? this.track.artist : null
    }
  },

  watch: {
    selectionFellBack: {
      immediate: true,
      handler (fellBack) {
        // A room that rejoined the group, vanished or went offline is dropped
        // from the stored choice, so it is not picked again on its own days
        // later when it happens to be solo once more.
        if (fellBack) {
          this.selection = 'main'
          writeStoredTarget('main')
        }
      }
    },
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
    'target.volume' (volume) {
      // Echoes of levels sent during the drag must not move the slider back;
      // only the released level itself (or HOLD_MS) ends the hold.
      if (this.volumeHeld !== null && volume === this.volumeHeld) {
        this.clearVolumeHold()
      }
    },
    'target.key' () {
      this.clearSeekHold()
      this.clearVolumeHold()
      this.cancelVolumeSender()
    }
  },

  methods: {
    selectTarget (key) {
      this.selection = key
      writeStoredTarget(key)
    },
    command (name) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      this.runAudioCommand(() => audioService.command(targetId, name))
    },
    seek (position) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      this.runAudioCommand(() => audioService.seek(targetId, position))
    },
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
    clearVolumeHold () {
      if (this.volumeHoldTimer !== null) {
        clearTimeout(this.volumeHoldTimer)
        this.volumeHoldTimer = null
      }
      this.volumeHeld = null
    },
    holdVolume (level) {
      this.clearVolumeHold()
      this.volumeHeld = level
      this.volumeHoldTimer = setTimeout(() => this.clearVolumeHold(), HOLD_MS)
    },
    cancelVolumeSender () {
      if (this.volumeSender !== null) {
        this.volumeSender.cancel()
        this.volumeSender = null
        this.volumeSenderKey = null
      }
    },
    /**
     * The live sender for the current target, bound to that target as it is
     * now, so a target switch mid-drag cannot send to the new target.
     */
    ensureVolumeSender () {
      const target = this.target
      if (!target) {
        return null
      }
      if (this.volumeSender === null || this.volumeSenderKey !== target.key) {
        this.cancelVolumeSender()
        // A solo room is turned up through its room, which the server maps to
        // the room's own player; the main group through its target.
        const { kind, roomId, targetId } = target
        this.volumeSender = createLiveSender(level => kind === 'room'
          ? audioService.setRoomVolume(roomId, level)
          : audioService.setTargetVolume(targetId, level))
        this.volumeSenderKey = target.key
      }
      return this.volumeSender
    },
    volumeStart (value) {
      this.volumeDragging = true
      this.volumeDrag = value
      this.ensureVolumeSender()
    },
    volumeInput (value) {
      if (this.volumeDragging) {
        this.volumeDrag = value
        if (this.volumeSender !== null) {
          this.volumeSender.push(value)
        }
      }
    },
    /**
     * Release (`end`) and `change` both land here; a release fires both, a
     * key press or click only `change`. The sender does not resend a level it
     * already sent, so the second call sends nothing.
     */
    finishVolume (level) {
      this.volumeDragging = false
      this.volumeDrag = null
      this.holdVolume(level)
      const sender = this.ensureVolumeSender()
      if (sender !== null) {
        sender.flush(level, call => this.runAudioCommand(call))
      }
    },
    timeText (seconds) {
      const s = Math.max(0, Math.floor(seconds || 0))
      return `${Math.floor(s / 60)}:${`${s % 60}`.padStart(2, '0')}`
    }
  },

  created () {
    // not reactive: the live volume sender of the current drag target
    this.volumeSender = null
    this.volumeSenderKey = null
    this.selection = readStoredTarget()
    this.store = acquire()
  },

  beforeDestroy () {
    release()
    if (this.ticker !== null) {
      clearInterval(this.ticker)
    }
    this.clearSeekHold()
    this.clearVolumeHold()
    this.cancelVolumeSender()
  }
}
</script>

<style lang="scss">
.kiosk-audio-player.v-footer {
  // In CSS rather than the `height` prop: VFooter parses that prop and drops a
  // value that is not a number, so a CSS variable never reaches the element.
  // Vuetify then measures the rendered height to pad v-main by.
  height: var(--kiosk-audio-bar-height);
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  overflow: hidden;
  // The target's colour along the top edge. A shadow rather than a border, so
  // the footer's measured height - which Vuetify pads v-main by - stays the
  // full bar height.
  box-shadow: inset 0 2px 0 var(--kiosk-audio-target-color) !important;

  .v-btn.kiosk-audio-player-btn {
    height: 100%;
    width: 40px;
    flex: 0 0 auto;
    border-radius: 0;
  }
}

.kiosk-audio-player--unavailable {
  .kiosk-audio-player-title,
  .kiosk-audio-player-target,
  .kiosk-audio-player-progress {
    opacity: 0.5;
  }
}

.kiosk-audio-player-target {
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  max-width: 180px;
  min-width: 0;
  padding: 0 8px;
  color: inherit;
}

.kiosk-audio-player-dot {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--kiosk-audio-target-color);
}

.kiosk-audio-player-target-icon.v-icon {
  margin-left: 4px;
  color: var(--kiosk-audio-target-color) !important;
}

.kiosk-audio-player-target-name {
  margin-left: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.kiosk-audio-player-title {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  flex: 1 1 0;
  min-width: 0;
  padding: 0 8px;
  text-align: left;
  color: inherit;

  span {
    display: block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.kiosk-audio-player-title-main {
  font-size: 14px;
  line-height: 17px;
}

.kiosk-audio-player-title-artist {
  font-size: 12px;
  line-height: 14px;
  opacity: 0.7;
}

.kiosk-audio-player-progress {
  display: flex;
  align-items: center;
  flex: 1 1 0;
  min-width: 70px;
  max-width: 320px;
  padding: 0 4px;

  .v-input {
    margin: 0;
  }

  // A bigger thumb: the bar is short, so the knob is the whole touch target.
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

.kiosk-audio-player-time {
  flex: 0 0 auto;
  min-width: 36px;
  font-size: 12px;
  text-align: right;
  margin-right: 4px;
  font-variant-numeric: tabular-nums;
}

.kiosk-audio-player-volume-menu .kiosk-audio-player-volume-slider {
  height: 160px;
}

.kiosk-audio-player--narrow {
  .kiosk-audio-player-target {
    padding: 0 6px;
  }

  .kiosk-audio-player-progress {
    min-width: 60px;
  }

  .v-btn.kiosk-audio-player-btn {
    width: 36px;
    min-width: 36px;
  }
}
</style>
