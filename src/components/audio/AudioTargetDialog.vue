<template>
  <v-dialog
    :value="value"
    max-width="560"
    :fullscreen="$vuetify.breakpoint.xsOnly"
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card class="audio-target-dialog">
      <v-card-title class="audio-dialog-title">
        <span>{{ $t('page.kiosk.audio.target') }}</span>
        <v-spacer></v-spacer>
        <v-btn icon class="audio-dialog-close" :aria-label="$t('page.kiosk.audio.close')" @click="$emit('input', false)">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text v-if="state" class="pa-0">
        <div
          class="audio-target-row audio-target-row--selectable"
          :class="{ 'audio-target-row--selected': selectedKey === 'main' }"
          data-key="main"
          @click="select('main')"
        >
          <span class="audio-target-dot" :style="{ backgroundColor: mainGroupColor }"></span>
          <v-icon small class="mx-1" :style="{ color: mainGroupColor }">speaker_group</v-icon>
          <span class="audio-target-name">{{ state.mainGroup.name || $t('page.kiosk.audio.mainGroup') }}</span>
          <v-spacer></v-spacer>
          <v-icon v-if="selectedKey === 'main'">check</v-icon>
        </div>

        <div
          v-for="room in state.rooms"
          :key="room.id"
          class="audio-target-row"
          :class="{
            'audio-target-row--selectable': selectable(room),
            'audio-target-row--selected': selectedKey === `room:${room.id}`,
            'audio-target-row--unavailable': !room.available
          }"
          :data-key="`room:${room.id}`"
        >
          <div class="audio-target-head" @click="selectable(room) && select(`room:${room.id}`)">
            <span class="audio-target-dot" :style="{ backgroundColor: room.color }"></span>
            <v-icon small class="mx-1" :style="{ color: room.color }">speaker</v-icon>
            <span class="audio-target-name">{{ room.name }}</span>
            <span class="audio-target-status text-caption ml-2">{{ statusText(room) }}</span>
            <v-spacer></v-spacer>
            <v-icon v-if="selectedKey === `room:${room.id}`">check</v-icon>
          </div>
          <div class="audio-target-controls">
            <v-icon small class="mr-1">volume_up</v-icon>
            <v-slider
              class="audio-target-volume"
              :value="volumeOf(room)"
              :disabled="!room.available"
              min="0"
              max="100"
              step="1"
              hide-details
              dense
              @change="setVolume(room, $event)"
            ></v-slider>
            <span class="audio-target-volume-value text-caption">{{ volumeOf(room) }}</span>
            <v-switch
              :key="`${room.id}-${switchGeneration}`"
              class="audio-target-grouped mt-0 ml-3"
              :input-value="room.pinned || room.grouped"
              :disabled="room.pinned || !room.available"
              :label="$t('page.kiosk.audio.inGroup')"
              hide-details
              dense
              @change="setGrouped(room, $event)"
            ></v-switch>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="js">
import { singleton as audioService, MAIN_GROUP_COLOR } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'

const HOLD_MS = 3000

/**
 * Where the kiosk audio bar plays: the main group or a room playing on its own
 * (openspec change `kiosk-audio-bar`). Every room also gets its volume and its
 * in/out-of-group switch here; the pinned room's switch stays in the group and
 * cannot be touched, and a room whose speaker is offline is dimmed.
 */
export default {
  name: 'AudioTargetDialog',

  mixins: [audioCommand],

  props: {
    value: { type: Boolean, default: false },
    state: { type: Object, default: null },
    selectedKey: { type: String, default: 'main' }
  },

  data: () => ({
    mainGroupColor: MAIN_GROUP_COLOR,
    // room id -> { level, from }: a released slider keeps its value until the
    // state reports a different volume for that room, or HOLD_MS pass
    heldVolumes: {},
    switchGeneration: 0
  }),

  watch: {
    state (state) {
      if (!state) {
        return
      }
      state.rooms.forEach(room => {
        const held = this.heldVolumes[room.id]
        if (held && room.volume !== held.from) {
          this.$delete(this.heldVolumes, room.id)
        }
      })
    }
  },

  methods: {
    selectable (room) {
      return room.available && !room.grouped && !!room.targetId
    },
    select (key) {
      this.$emit('select', key)
      this.$emit('input', false)
    },
    statusText (room) {
      if (!room.available) {
        return this.$t('page.kiosk.audio.roomUnavailable')
      }
      if (room.pinned) {
        return this.$t('page.kiosk.audio.pinned')
      }
      return this.$t(room.grouped ? 'page.kiosk.audio.inGroup' : 'page.kiosk.audio.outOfGroup')
    },
    volumeOf (room) {
      const held = this.heldVolumes[room.id]
      if (held) {
        return held.level
      }
      return room.volume !== null ? room.volume : 0
    },
    setVolume (room, level) {
      this.$set(this.heldVolumes, room.id, { level, from: room.volume })
      setTimeout(() => {
        const held = this.heldVolumes[room.id]
        if (held && held.level === level) {
          this.$delete(this.heldVolumes, room.id)
        }
      }, HOLD_MS)
      this.runAudioCommand(() => audioService.setRoomVolume(room.id, level))
    },
    async setGrouped (room, grouped) {
      const ok = await this.runAudioCommand(() => audioService.setRoomGrouped(room.id, !!grouped))
      if (!ok) {
        // the switch moved under the finger; put it back where the state says
        this.switchGeneration++
      }
    }
  }
}
</script>

<style lang="scss">
.audio-dialog-title {
  flex-wrap: nowrap;
}

.audio-target-row {
  padding: 8px 16px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.2);

  &.audio-target-row--selected {
    background-color: rgba(128, 128, 128, 0.15);
  }

  &.audio-target-row--unavailable {
    opacity: 0.45;
  }

  &[data-key='main'] {
    display: flex;
    align-items: center;
    min-height: 48px;
  }

  &.audio-target-row--selectable[data-key='main'],
  &.audio-target-row--selectable .audio-target-head {
    cursor: pointer;
  }
}

.audio-target-head {
  display: flex;
  align-items: center;
  min-height: 36px;
}

.audio-target-dot {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.audio-target-name {
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-target-status {
  white-space: nowrap;
  opacity: 0.7;
}

.audio-target-controls {
  display: flex;
  align-items: center;

  .audio-target-volume {
    flex: 1 1 auto;
    min-width: 80px;
  }

  .audio-target-volume-value {
    min-width: 28px;
    text-align: right;
  }

  .audio-target-grouped {
    flex: 0 0 auto;
  }
}
</style>
