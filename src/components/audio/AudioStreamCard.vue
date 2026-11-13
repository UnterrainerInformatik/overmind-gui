<template>
  <div
    class="audio-stream-card"
    :class="{
      'audio-stream-card--narrow': narrow,
      'audio-stream-card--selected': selected,
      'audio-stream-card--pulse': pulse,
      'audio-stream-card--disabled': disabled
    }"
    :style="{ '--audio-stream-color': stream.color }"
    :data-key="stream.key"
    role="button"
    tabindex="0"
    @click="select"
    @keydown.enter="select"
  >
    <div class="audio-stream-card-band"></div>
    <div class="audio-stream-card-head">
      <div v-if="!narrow" class="audio-stream-card-cover">
        <img v-if="coverUrl" :src="coverUrl" alt="" />
        <v-icon v-else>music_note</v-icon>
      </div>
      <div class="audio-stream-card-texts">
        <div class="audio-stream-card-name">
          <v-icon x-small class="audio-stream-card-kind">{{ stream.kind === 'main' ? 'speaker_group' : 'speaker' }}</v-icon>
          <span>{{ stream.name }}</span>
          <v-icon v-if="selected" small class="audio-stream-card-check" :aria-label="$t('page.kiosk.audio.plan.selected')">check_circle</v-icon>
        </div>
        <template v-if="!narrow">
          <div class="audio-stream-card-title">{{ track && track.title ? track.title : $t('page.kiosk.audio.nothingPlaying') }}</div>
          <div v-if="track && track.artist" class="audio-stream-card-artist">{{ track.artist }}</div>
        </template>
        <div v-else class="audio-stream-card-hint">{{ $t('page.kiosk.audio.plan.startFromBar') }}</div>
      </div>
    </div>
    <div v-if="!narrow" class="audio-stream-card-controls" @click.stop @keydown.enter.stop>
      <v-btn icon small class="audio-stream-card-previous" :disabled="disabled" @click="command('previous')">
        <v-icon>skip_previous</v-icon>
      </v-btn>
      <v-btn icon small class="audio-stream-card-playpause" :disabled="disabled" @click="command(playing ? 'pause' : 'play')">
        <v-icon>{{ playing ? 'pause' : 'play_arrow' }}</v-icon>
      </v-btn>
      <v-btn icon small class="audio-stream-card-next" :disabled="disabled" @click="command('next')">
        <v-icon>skip_next</v-icon>
      </v-btn>
      <v-slider
        class="audio-stream-card-volume"
        :value="shownVolume"
        :disabled="disabled || stream.volume === null"
        min="0"
        max="100"
        step="1"
        hide-details
        dense
        @start="volumeStart"
        @input="volumeInput"
        @end="finishVolume"
        @change="finishVolume"
      ></v-slider>
      <span class="audio-stream-card-volume-value">{{ shownVolume }}</span>
    </div>
  </div>
</template>

<script lang="js">
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'
import { createHeldLevels } from '@/utils/heldLevels'

/**
 * One stream of the audio plan popup's strip: the main group or a solo room
 * (openspec change `kiosk-audio-plan-popup`, "One card per stream"). Cover,
 * title, transport and the stream's volume, which is sent live while dragged
 * to the stream's target. A solo room with nothing to play gets the narrow
 * form. Tapping the card outside its controls selects the stream.
 */
export default {
  name: 'AudioStreamCard',

  mixins: [audioCommand],

  props: {
    // { key, kind, targetId, name, color, playback, volume }
    stream: { type: Object, required: true },
    selected: { type: Boolean, default: false },
    pulse: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },

  computed: {
    track () {
      return this.stream.playback ? this.stream.playback.track : null
    },
    playing () {
      return !!this.stream.playback && this.stream.playback.state === 'playing'
    },
    narrow () {
      const p = this.stream.playback
      return this.stream.kind === 'room' && (!p || (!p.track && p.state === 'idle'))
    },
    coverUrl () {
      return this.track ? this.track.imageUrl : null
    },
    volumeKey () {
      return `target:${this.stream.targetId}`
    },
    shownVolume () {
      const level = this.levels.shown(this.volumeKey, this.stream.volume)
      return level !== null ? level : 0
    }
  },

  watch: {
    'stream.volume' (volume) {
      this.levels.observe(this.volumeKey, volume)
    }
  },

  methods: {
    select () {
      if (!this.disabled) {
        this.$emit('select', this.stream.key)
      }
    },
    command (name) {
      const targetId = this.stream.targetId
      this.runAudioCommand(() => audioService.command(targetId, name))
    },
    volumeStart (level) {
      this.levels.start(this.volumeKey, level)
    },
    volumeInput (level) {
      this.levels.move(this.volumeKey, level)
    },
    /** Release fires `end` and `change`; the sender sends the level once. */
    finishVolume (level) {
      this.levels.finish(this.volumeKey, level, call => this.runAudioCommand(call))
    }
  },

  created () {
    this.levels = createHeldLevels(key => {
      const targetId = key.substring('target:'.length)
      return level => audioService.setTargetVolume(targetId, level)
    })
  },

  beforeDestroy () {
    this.levels.destroy()
  }
}
</script>

<style lang="scss">
.audio-stream-card {
  position: relative;
  flex: 0 0 280px;
  width: 280px;
  // a phone's strip is far taller than a card needs
  max-height: 170px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 6px;
  background-color: rgba(128, 128, 128, 0.14);
  outline: none;
  cursor: pointer;
  transition: box-shadow 0.2s;

  &.audio-stream-card--narrow {
    flex-basis: 140px;
    width: 140px;
  }

  &.audio-stream-card--selected {
    box-shadow: inset 0 0 0 2px var(--audio-stream-color);
    background-color: rgba(128, 128, 128, 0.24);
  }

  &.audio-stream-card--pulse {
    animation: audio-stream-card-pulse 0.5s ease-in-out 3;
  }

  &.audio-stream-card--disabled {
    opacity: 0.5;
    cursor: default;
  }
}

@keyframes audio-stream-card-pulse {
  0%, 100% { box-shadow: inset 0 0 0 2px var(--audio-stream-color); }
  50% { box-shadow: inset 0 0 0 6px var(--audio-stream-color), 0 0 12px var(--audio-stream-color); }
}

.audio-stream-card-band {
  flex: 0 0 6px;
  background-color: var(--audio-stream-color);
}

.audio-stream-card-head {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-height: 0;
  padding: 6px 8px 0;
}

.audio-stream-card-cover {
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  margin-right: 8px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(128, 128, 128, 0.25);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.audio-stream-card-texts {
  flex: 1 1 auto;
  min-width: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;

  > div {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.audio-stream-card-name {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .audio-stream-card-kind.v-icon {
    margin-right: 4px;
    color: var(--audio-stream-color) !important;
  }

  .audio-stream-card-check.v-icon {
    margin-left: 4px;
    color: var(--audio-stream-color) !important;
  }
}

.audio-stream-card-title {
  font-size: 14px;
  line-height: 18px;
}

.audio-stream-card-artist {
  font-size: 12px;
  line-height: 15px;
  opacity: 0.7;
}

.audio-stream-card-hint {
  white-space: normal !important;
  font-size: 12px;
  line-height: 15px;
  opacity: 0.7;
  margin-top: 4px;
}

.audio-stream-card-controls {
  display: flex;
  align-items: center;
  flex: 0 0 44px;
  padding: 0 6px;
  cursor: default;

  .audio-stream-card-volume {
    flex: 1 1 auto;
    min-width: 60px;
    margin: 0 0 0 4px;
  }

  .audio-stream-card-volume-value {
    flex: 0 0 26px;
    text-align: right;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
}
</style>
