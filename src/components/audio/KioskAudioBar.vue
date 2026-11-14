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
          <v-icon small class="kiosk-audio-player-target-icon">{{ targetIcon }}</v-icon>
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

    <AudioSeekSlider
      ref="seek"
      class="kiosk-audio-player-progress"
      time-class="kiosk-audio-player-time"
      slider-class="kiosk-audio-player-slider"
      :title="tooltips ? $t('page.kiosk.audio.tooltip.seek') : null"
      :target="target"
      :disabled="!available"
      :show-time="!narrow"
    ></AudioSeekSlider>

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

    <AudioPlanDialog
      v-model="targetDialog"
      :state="state"
      :selectedKey="target ? target.key : 'main'"
      @select="selectTarget"
    ></AudioPlanDialog>
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
import AudioPlanDialog from '@/components/audio/AudioPlanDialog.vue'
import AudioQueueDialog from '@/components/audio/AudioQueueDialog.vue'
import AudioRadioDialog from '@/components/audio/AudioRadioDialog.vue'
import AudioSeekSlider from '@/components/audio/AudioSeekSlider.vue'

// How long a released volume slider keeps its value while no newer state arrives.
const HOLD_MS = 3000

/**
 * The music player bar along the bottom of every kiosk page (openspec change
 * `kiosk-audio-player`). It controls one target - the main group or a room that
 * plays on its own - and shows that target's colour. Everything it shows comes
 * from the shared audio state; commands are sent and the next state shows
 * their effect, except for the two sliders, which hold the released value
 * until that state arrives (design.md D7). The seek slider is the shared
 * `AudioSeekSlider` (openspec change `kiosk-search-track-preview`). The volume slider sends its level
 * live while dragged (openspec change `kiosk-live-volume`).
 */
export default {
  name: 'KioskAudioBar',

  mixins: [audioCommand],

  components: {
    AudioPlanDialog,
    AudioQueueDialog,
    AudioRadioDialog,
    AudioSeekSlider
  },

  data: () => ({
    store: null,
    selection: 'main',
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
    /**
     * True once a loaded state has made a remembered room fall back to the main
     * group. Never for a web player: it stays remembered while it is gone and is
     * controlled again when it comes back (openspec change
     * `audio-web-player-targets`, design D3).
     */
    selectionFellBack () {
      return !!this.state && this.selection.startsWith('room:') && !this.selectedRoom
    },
    targetIcon () {
      const kind = this.target ? this.target.kind : 'main'
      return kind === 'room' ? 'speaker' : kind === 'player' ? 'devices' : 'speaker_group'
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
    'target.volume' (volume) {
      // Echoes of levels sent during the drag must not move the slider back;
      // only the released level itself (or HOLD_MS) ends the hold.
      if (this.volumeHeld !== null && volume === this.volumeHeld) {
        this.clearVolumeHold()
      }
    },
    'target.key' () {
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
    skip (seconds) {
      if (this.$refs.seek) {
        this.$refs.seek.skip(seconds)
      }
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
        // the room's own player; the main group and a web player through
        // their target.
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

// Twice Vuetify's 150px long and 1.5 times as wide (track, thumb, touch area)
// as the default vertical slider (openspec change `kiosk-queue-live-updates`).
// Shorter on low screens, so the menu stays above the bar in phone landscape.
.kiosk-audio-player-volume-menu .kiosk-audio-player-volume-slider .v-slider--vertical {
  width: 36px;
  min-height: 0;
  height: #{'min(300px, calc(100vh - 110px))'};

  .v-slider__track-container {
    width: 3px;
  }

  .v-slider__thumb {
    width: 18px;
    height: 18px;
    left: -9px;

    &:before {
      width: 54px;
      height: 54px;
      left: -18px;
      top: -18px;
    }
  }
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
