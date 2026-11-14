<template>
  <div class="audio-balance-panel" :data-room-id="room.id" @click.stop @pointerdown.stop>
    <div class="audio-balance-panel-head">
      <v-icon small class="audio-balance-panel-icon">tune</v-icon>
      <span class="audio-balance-panel-title">{{ room.name }}</span>
      <v-spacer></v-spacer>
      <v-btn icon small class="audio-balance-panel-close" :aria-label="$t('page.kiosk.audio.close')" @click="$emit('close')">
        <v-icon>close</v-icon>
      </v-btn>
    </div>
    <div class="audio-balance-panel-speakers">
      <div
        v-for="speaker in room.speakers"
        :key="speaker.playerId"
        class="audio-balance-speaker"
        :class="{ 'audio-balance-speaker--disabled': !usable(speaker) }"
        :data-player-id="speaker.playerId"
      >
        <span class="audio-balance-speaker-name">
          {{ speaker.name }}
          <span v-if="!speaker.available" class="audio-balance-speaker-note">{{ $t('page.kiosk.audio.plan.balance.speakerUnavailable') }}</span>
        </span>
        <v-slider
          class="audio-balance-speaker-volume"
          :value="shownOf(speaker) !== null ? shownOf(speaker) : 0"
          :disabled="!usable(speaker)"
          :color="volumeColor"
          :track-color="volumeTrackColor"
          min="0"
          max="100"
          step="1"
          hide-details
          dense
          @start="level => levels.start(keyOf(speaker), level)"
          @input="level => levels.move(keyOf(speaker), level)"
          @end="level => finish(speaker, level)"
          @change="level => finish(speaker, level)"
        ></v-slider>
        <span class="audio-balance-speaker-value">{{ shownOf(speaker) !== null ? shownOf(speaker) : '–' }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="js">
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'
import { createHeldLevels } from '@/utils/heldLevels'

/**
 * The audio plan popup's balance panel for one group room (openspec change
 * `kiosk-audio-plan-balance-tool`, design D2/D3): one slider per speaker in the
 * server's order, sent live while dragged to the speaker volume route with the
 * shared hold logic, a failure reported only for the released level. A speaker
 * that is unavailable or reports no level gets a disabled slider. The dialog
 * decides when it closes; `close` asks it to.
 */
export default {
  name: 'AudioBalancePanel',

  mixins: [audioCommand],

  props: {
    // an AudioRoom with `balanceSupported` and at least two speakers
    room: { type: Object, required: true }
  },

  computed: {
    // the stream card's slider accent (change `audio-card-volume-contrast`, D1)
    volumeColor () {
      return this.$vuetify.theme.dark ? '#4FC3F7' : '#1976D2'
    },
    volumeTrackColor () {
      return this.$vuetify.theme.dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'
    }
  },

  watch: {
    room: {
      immediate: true,
      handler (room) {
        room.speakers.forEach(s => this.levels.observe(this.keyOf(s), s.volume))
      }
    }
  },

  methods: {
    keyOf (speaker) {
      return `speaker:${this.room.id}:${speaker.playerId}`
    },
    usable (speaker) {
      return speaker.available && speaker.volume !== null
    },
    shownOf (speaker) {
      return this.levels.shown(this.keyOf(speaker), speaker.volume)
    },
    /** Release fires `end` and `change`; the sender sends the level once. */
    finish (speaker, level) {
      this.levels.finish(this.keyOf(speaker), level, call => this.runAudioCommand(call))
    }
  },

  beforeCreate () {
    // not reactive: one live sender and hold per speaker; before `created`, as the
    // immediate `room` watcher already observes
    this.levels = createHeldLevels(key => {
      const playerId = key.substring(`speaker:${this.room.id}:`.length)
      const roomId = this.room.id
      return level => audioService.setSpeakerVolume(roomId, playerId, level)
    })
  },

  beforeDestroy () {
    this.levels.destroy()
  }
}
</script>

<style lang="scss">
.audio-balance-panel {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  // as tall as its speakers need, at most the strip
  max-height: calc(100% - 16px);
  z-index: 2;
  display: flex;
  flex-direction: column;
  margin: 8px;
  border-radius: 6px;
  overflow: hidden;
  background-color: var(--v-background-base, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  cursor: default;
}

.theme--dark .audio-balance-panel {
  background-color: #2b2b2b;
}

.audio-balance-panel-head {
  display: flex;
  align-items: center;
  flex: 0 0 40px;
  padding: 0 4px 0 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);

  .audio-balance-panel-icon.v-icon {
    margin-right: 6px;
  }

  .audio-balance-panel-title {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .audio-balance-panel-close.v-btn {
    width: 40px;
    height: 40px;
  }
}

.audio-balance-panel-speakers {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 12px;
}

.audio-balance-speaker {
  display: flex;
  align-items: center;
  min-height: 44px;

  .audio-balance-speaker-name {
    flex: 0 1 40%;
    max-width: 220px;
    min-width: 0;
    font-size: 13px;
    line-height: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .audio-balance-speaker-note {
    font-size: 11px;
    opacity: 0.7;
  }

  .audio-balance-speaker-volume {
    flex: 1 1 auto;
    min-width: 80px;
    margin: 0 0 0 8px;
  }

  .audio-balance-speaker-value {
    flex: 0 0 30px;
    text-align: right;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  &.audio-balance-speaker--disabled .audio-balance-speaker-name {
    opacity: 0.6;
  }
}

// phone: the name on its own line, so the part that tells the speakers apart is not cut off
@media (max-width: 599px) {
  .audio-balance-speaker {
    flex-wrap: wrap;
    padding-top: 4px;

    .audio-balance-speaker-name {
      flex: 0 0 100%;
      max-width: none;
    }

    .audio-balance-speaker-volume {
      margin-left: 0;
    }
  }
}
</style>
