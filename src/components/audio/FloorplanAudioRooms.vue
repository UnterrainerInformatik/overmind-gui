<template>
  <div class="floorplan-audio-rooms">
    <div
      v-for="room in rooms"
      :key="room.id"
      class="floorplan-audio-room"
      :class="{ 'floorplan-audio-room--unavailable': !room.available }"
      :data-room-id="room.id"
      :style="pairStyle(room)"
    >
      <button
        type="button"
        class="floorplan-audio-button floorplan-audio-group noFocus"
        :class="{
          'floorplan-audio-group--in': room.grouped || room.pinned,
          'floorplan-audio-group--solo': !room.grouped && !room.pinned,
          'floorplan-audio-group--pinned': room.pinned
        }"
        :style="groupStyle(room)"
        :disabled="!room.available || room.pinned || isPending(room, 'group')"
        :aria-label="groupText(room)"
        :title="tooltips ? groupText(room) : null"
        @click="toggleGrouped(room)"
      >
        <v-icon :size="iconSize" :color="room.grouped || room.pinned ? 'blue-grey darken-4' : 'white'">
          {{ room.grouped || room.pinned ? 'speaker_group' : 'speaker' }}
        </v-icon>
        <v-icon v-if="room.pinned" class="floorplan-audio-pin" :size="pinSize" color="blue-grey darken-4">push_pin</v-icon>
        <v-progress-circular
          v-if="isPending(room, 'group')"
          class="floorplan-audio-progress"
          indeterminate
          :size="iconSize"
          width="2"
        ></v-progress-circular>
      </button>
      <button
        type="button"
        class="floorplan-audio-button floorplan-audio-link noFocus"
        :class="room.lightLinked ? 'floorplan-audio-link--on' : 'floorplan-audio-link--off'"
        :style="linkStyle(room)"
        :disabled="!room.available || isPending(room, 'link')"
        :aria-label="linkText(room)"
        :title="tooltips ? linkText(room) : null"
        @click="toggleLightLinked(room)"
      >
        <v-icon :size="iconSize" :color="room.lightLinked ? 'grey darken-4' : 'grey lighten-1'">
          {{ room.lightLinked ? 'link' : 'link_off' }}
        </v-icon>
        <v-progress-circular
          v-if="isPending(room, 'link')"
          class="floorplan-audio-progress"
          indeterminate
          :size="iconSize"
          width="2"
        ></v-progress-circular>
      </button>
    </div>
  </div>
</template>

<script lang="js">
import { mapGetters } from 'vuex'
import { acquire, release } from '@/utils/audioState'
import { singleton as audioService, MAIN_GROUP_COLOR } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'

const AVATAR_BASE_SIZE = 46
const MIN_SIZE = 32
const LINKED_COLOR = '#FFB300'
const UNLINKED_COLOR = '#424242'

/**
 * Each audio room's group and light-link buttons on the lights floor plan
 * (openspec change `kiosk-light-and-sound`). Rooms and their places come from
 * the shared audio state, so a room without both button coordinates is not
 * drawn, and nothing is while there is no state. Taps only send; the buttons
 * change when the next `audio-state` shows the server's answer (design D4).
 */
export default {
  name: 'FloorplanAudioRooms',

  mixins: [audioCommand],

  props: {
    scale: {
      type: Number,
      required: true
    }
  },

  data: () => ({
    store: null,
    pending: {}
  }),

  computed: {
    ...mapGetters('gui/tooltips', {
      tooltips: 'tooltips'
    }),
    rooms () {
      const state = this.store ? this.store.state : null
      return state ? state.rooms.filter(r => r.buttonX !== null && r.buttonY !== null) : []
    },
    size () {
      return Math.max(AVATAR_BASE_SIZE * this.scale, MIN_SIZE)
    },
    iconSize () {
      return Math.round(this.size * 0.55)
    },
    pinSize () {
      return Math.round(this.size * 0.32)
    }
  },

  methods: {
    pairStyle (room) {
      return `top: ${room.buttonY * this.scale}px; left: ${room.buttonX * this.scale}px; gap: ${Math.round(this.size / 8)}px;`
    },
    buttonStyle (color) {
      return `width: ${this.size}px; height: ${this.size}px; background-color: ${color};`
    },
    groupStyle (room) {
      return this.buttonStyle(room.grouped || room.pinned ? MAIN_GROUP_COLOR : room.color)
    },
    linkStyle (room) {
      return this.buttonStyle(room.lightLinked ? LINKED_COLOR : UNLINKED_COLOR)
    },
    groupText (room) {
      const key = !room.available
        ? 'roomUnavailableNamed'
        : room.pinned ? 'pinnedRoom' : room.grouped ? 'leaveGroup' : 'joinGroup'
      return this.$t(`page.kiosk.audio.map.${key}`, { room: room.name })
    },
    linkText (room) {
      const key = !room.available ? 'roomUnavailableNamed' : room.lightLinked ? 'lightLinkOn' : 'lightLinkOff'
      return this.$t(`page.kiosk.audio.map.${key}`, { room: room.name })
    },
    isPending (room, kind) {
      return !!this.pending[`${room.id}:${kind}`]
    },
    async send (room, kind, call) {
      const key = `${room.id}:${kind}`
      if (!room.available || this.pending[key]) {
        return
      }
      this.$set(this.pending, key, true)
      try {
        await this.runAudioCommand(call)
      } finally {
        this.$delete(this.pending, key)
      }
    },
    toggleGrouped (room) {
      if (room.pinned) {
        return
      }
      this.send(room, 'group', () => audioService.setRoomGrouped(room.id, !room.grouped))
    },
    toggleLightLinked (room) {
      this.send(room, 'link', () => audioService.setRoomLightLinked(room.id, !room.lightLinked))
    }
  },

  created () {
    this.store = acquire()
  },

  beforeDestroy () {
    release()
  }
}
</script>

<style lang="scss">
.floorplan-audio-rooms {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.floorplan-audio-room {
  position: absolute;
  display: flex;
  flex-wrap: nowrap;
}

.floorplan-audio-button {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);

  &:disabled {
    cursor: default;
  }
}

.floorplan-audio-room--unavailable .floorplan-audio-button {
  opacity: 0.4;
}

.floorplan-audio-pin {
  position: absolute !important;
  top: 6%;
  right: 6%;
  transform: rotate(30deg);
}

.floorplan-audio-progress {
  position: absolute !important;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
