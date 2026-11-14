<template>
  <div
    ref="map"
    class="audio-plan-map"
    :class="[`audio-plan-map--${tool}`, { 'audio-plan-map--fallback': fallback, 'audio-plan-map--disabled': disabled }]"
  >
    <div class="audio-plan-map-canvas">
      <img
        v-if="!fallback"
        class="audio-plan-map-image"
        :src="imageSrc"
        alt=""
        draggable="false"
        @error="imageFailed = true"
      />
      <svg
        v-if="!fallback"
        class="audio-plan-map-svg"
        :viewBox="`0 0 ${planWidth} ${planHeight}`"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            v-for="h in hatches"
            :id="h.id"
            :key="h.id"
            patternUnits="userSpaceOnUse"
            :width="hatchStep"
            :height="hatchStep"
            :patternTransform="`rotate(${h.angle})`"
          >
            <rect x="0" y="0" :width="h.dark / scale" :height="hatchStep" :fill="h.darkColor"></rect>
            <rect :x="h.dark / scale" y="0" :width="h.line / scale" :height="hatchStep" :fill="h.color"></rect>
          </pattern>
          <clipPath v-for="r in placed" :id="clipId(r.room)" :key="`clip-${r.room.id}`">
            <polygon v-for="p in r.geometry.polygons" :key="p.key" :points="p.points.join(',')"></polygon>
          </clipPath>
        </defs>

        <!-- below every room, so a neighbour's own area always wins (design D4) -->
        <g class="audio-plan-halos">
          <circle
            v-for="r in smallRooms"
            :key="`halo-${r.room.id}`"
            class="audio-plan-halo"
            :data-room-id="r.room.id"
            :cx="r.geometry.centroid.x"
            :cy="r.geometry.centroid.y"
            :r="haloRadius"
            fill="transparent"
            @pointerdown="press(r.room, $event)"
          ></circle>
        </g>

        <g
          v-for="r in placed"
          :key="r.room.id"
          class="audio-plan-room"
          :class="roomClasses(r.room)"
          :data-room-id="r.room.id"
        >
          <polygon
            v-for="p in r.geometry.polygons"
            :key="p.key"
            class="audio-plan-room-area"
            :points="p.points.join(',')"
            :fill="fillOf(r.room)"
            :fill-opacity="fillOpacityOf(r.room)"
            @pointerdown="press(r.room, $event)"
          ></polygon>
          <rect
            v-if="tool === 'volume' && levelOf(r.room) !== null"
            class="audio-plan-room-level"
            :x="r.geometry.box.x"
            :y="r.geometry.box.y + r.geometry.box.height * (1 - levelOf(r.room) / 100)"
            :width="r.geometry.box.width"
            :height="r.geometry.box.height * levelOf(r.room) / 100"
            :fill="fillOf(r.room)"
            fill-opacity="0.9"
            :clip-path="`url(#${clipId(r.room)})`"
          ></rect>
          <template v-for="h in hatchesOf(r.room)">
            <polygon
              v-for="p in r.geometry.polygons"
              :key="`${h}-${p.key}`"
              class="audio-plan-room-hatch"
              :class="`audio-plan-room-hatch--${h}`"
              :points="p.points.join(',')"
              :fill="`url(#${hatchId(h, fillOf(r.room))})`"
            ></polygon>
          </template>
          <template v-if="outlineOf(r.room)">
            <polygon
              v-for="p in r.geometry.polygons"
              :key="`outline-${p.key}`"
              class="audio-plan-room-outline"
              :points="p.points.join(',')"
              fill="none"
              :stroke="outlineOf(r.room).color"
              :stroke-width="outlineOf(r.room).width"
              vector-effect="non-scaling-stroke"
            ></polygon>
          </template>
        </g>
      </svg>

      <div v-if="!fallback" class="audio-plan-marks">
        <div
          v-for="r in placed"
          :key="`mark-${r.room.id}`"
          class="audio-plan-mark"
          :class="roomClasses(r.room)"
          :data-room-id="r.room.id"
          :style="markStyle(r.geometry)"
        >
          <span v-if="tool === 'overview' && nameFits(r)" class="audio-plan-mark-name">{{ r.room.name }}</span>
          <v-icon v-if="tool === 'overview' && r.room.lightLinked" x-small class="audio-plan-mark-bulb">lightbulb</v-icon>
          <v-icon v-if="tool === 'group' && r.room.pinned" small class="audio-plan-mark-pin">push_pin</v-icon>
          <v-icon v-if="tool === 'light' && r.room.lightLinked" small class="audio-plan-mark-bulb">lightbulb</v-icon>
          <span v-if="tool === 'volume' && levelOf(r.room) !== null" class="audio-plan-mark-level">{{ levelOf(r.room) }}</span>
        </div>
      </div>

      <div v-if="chips.length" class="audio-plan-chips" :class="{ 'audio-plan-chips--all': fallback }">
        <div v-if="fallback" class="audio-plan-chips-note">{{ $t('page.kiosk.audio.plan.noPlan') }}</div>
        <div
          v-for="room in chips"
          :key="`chip-${room.id}`"
          class="audio-plan-chip"
          :class="roomClasses(room)"
          :data-room-id="room.id"
          :style="chipStyle(room)"
          @pointerdown="press(room, $event)"
        >
          <div v-if="tool === 'volume' && levelOf(room) !== null" class="audio-plan-chip-level" :style="{ height: `${levelOf(room)}%` }"></div>
          <div v-if="hatchesOf(room).length" class="audio-plan-chip-hatch" :class="hatchesOf(room).map(h => `audio-plan-chip-hatch--${h}`)"></div>
          <v-icon v-if="tool === 'group' && room.pinned" x-small class="audio-plan-mark-pin">push_pin</v-icon>
          <v-icon v-if="(tool === 'light' || tool === 'overview') && room.lightLinked" x-small class="audio-plan-mark-bulb">lightbulb</v-icon>
          <span class="audio-plan-chip-name">{{ room.name }}</span>
          <span v-if="tool === 'volume' && levelOf(room) !== null" class="audio-plan-mark-level">{{ levelOf(room) }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="pressed"
      class="audio-plan-finger"
      :class="{ 'audio-plan-finger--level': draggingVolume, 'audio-plan-finger--right': pressed.x < 120 }"
      :style="{ left: `${pressed.x}px`, top: `${pressed.y}px` }"
    >
      <span v-if="draggingVolume" class="audio-plan-finger-level">{{ levelOf(pressed.room) }}</span>
      <span class="audio-plan-finger-name">{{ pressed.room.name }}</span>
    </div>
  </div>
</template>

<script lang="js">
import { singleton as audioService, MAIN_GROUP_COLOR } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'
import { createHeldLevels } from '@/utils/heldLevels'
import { planAppliances } from '@/utils/audioPlanAppliances'
import { layoutRooms, isSmallOnScreen, PLAN_WIDTH, PLAN_HEIGHT, MIN_TOUCH_PX } from '@/utils/audioPlanGeometry'

const DRAG_THRESHOLD_PX = 6
const PX_PER_LEVEL = 2
const HATCH_STEP_PX = 6
const UNAVAILABLE_COLOR = '#9E9E9E'
const LINKED_COLOR = '#FFB300'
/** Outline of grouped rooms in the group tool; light, so it stands out on the main group's dark fill. */
const GROUPED_OUTLINE_COLOR = '#ECEFF1'
// estimated width of one character of a room name at 12 px
const CHAR_PX = 7

/**
 * The audio plan popup's floor plan (openspec change `kiosk-audio-plan-popup`,
 * design D2-D5, D9): every audio room drawn as its lights' areas in the colour
 * of its stream, mute as hatching (manual `╱`, by the lights `╲`), and the
 * room itself as the button whose meaning the active tool decides. Rooms with
 * no area, or all rooms when the plan or the appliances are missing, are chips
 * that work the same way. Everything shown is the server's state; requests
 * only send, one at a time per room and tool, and the Volume tool's drag is
 * sent live with the shared hold logic (design D6).
 */
export default {
  name: 'AudioPlanMap',

  mixins: [audioCommand],

  props: {
    state: { type: Object, required: true },
    tool: { type: String, default: 'overview' },
    disabled: { type: Boolean, default: false }
  },

  data: () => ({
    planWidth: PLAN_WIDTH,
    planHeight: PLAN_HEIGHT,
    appliances: planAppliances,
    imageFailed: false,
    width: 0,
    // `${tool}:${roomId}` -> true while that request is in flight
    pending: {},
    // the press under the finger: { room, pointerId, x0, y0, x, y, start, moved, level }
    pressed: null
  }),

  computed: {
    imageSrc () {
      return this.$store.state.gui.floorplan
    },
    scale () {
      return this.width > 0 ? this.width / PLAN_WIDTH : 1
    },
    fallback () {
      return this.imageFailed || !this.imageSrc || this.appliances.failed
    },
    layout () {
      if (this.fallback || !this.appliances.index) {
        return new Map()
      }
      return layoutRooms(this.state.rooms, this.appliances.index)
    },
    placed () {
      return this.state.rooms
        .filter(room => this.layout.has(`${room.id}`))
        .map(room => ({ room, geometry: this.layout.get(`${room.id}`) }))
    },
    smallRooms () {
      return this.placed.filter(r => isSmallOnScreen(r.geometry, this.scale))
    },
    chips () {
      return this.state.rooms.filter(room => !this.layout.has(`${room.id}`))
    },
    haloRadius () {
      return MIN_TOUCH_PX / 2 / this.scale
    },
    hatchStep () {
      return HATCH_STEP_PX / this.scale
    },
    /**
     * One pattern per hatch kind and room colour: a line in the room's stream
     * colour beside a dark edge, so it stands out from its own fill.
     * `╱` is a vertical line turned clockwise, `╲` one turned anticlockwise.
     */
    hatches () {
      const strong = this.tool === 'mute'
      const line = {
        dark: strong ? 1.5 : 1,
        line: strong ? 2.5 : 1.5,
        darkColor: strong ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'
      }
      const colors = [...new Set(this.placed.map(r => this.fillOf(r.room)))]
      return colors.flatMap(color => [
        { id: this.hatchId('manual', color), angle: 45, color, ...line },
        { id: this.hatchId('light', color), angle: -45, color, ...line }
      ])
    },
    draggingVolume () {
      return !!this.pressed && this.pressed.moved && this.pressed.level !== null
    }
  },

  watch: {
    state (state) {
      state.rooms.forEach(room => this.levels.observe(this.levelKey(room), room.volume))
    },
    tool () {
      this.cancelPress()
    }
  },

  methods: {
    hatchId (kind, color) {
      return `audio-plan-${this._uid}-hatch-${kind}-${color.replace(/[^0-9a-zA-Z]/g, '')}`
    },
    clipId (room) {
      return `audio-plan-${this._uid}-clip-${room.id}`
    },
    levelKey (room) {
      return `room:${room.id}`
    },
    streamKeyOf (room) {
      return room.grouped || room.pinned ? 'main' : `room:${room.id}`
    },
    fillOf (room) {
      if (!room.available) {
        return UNAVAILABLE_COLOR
      }
      return room.grouped || room.pinned ? MAIN_GROUP_COLOR : room.color
    },
    fillOpacityOf (room) {
      if (!room.available) {
        return 0.35
      }
      switch (this.tool) {
        case 'mute': return 0.45
        case 'volume': return 0.25
        case 'light': return room.lightLinked ? 0.6 : 0.25
        default: return 0.6
      }
    },
    /** Manual first, so crossed hatching draws `╲` over `╱`. */
    hatchesOf (room) {
      const out = []
      if (room.manualMuted) {
        out.push('manual')
      }
      if (room.lightMuted) {
        out.push('light')
      }
      return out
    },
    outlineOf (room) {
      if (this.pressed && this.pressed.room.id === room.id) {
        return { color: '#FFFFFF', width: 2 }
      }
      if (this.tool === 'light' && room.lightLinked) {
        return { color: LINKED_COLOR, width: 3 }
      }
      if (this.tool === 'group' && (room.grouped || room.pinned) && room.available) {
        return { color: GROUPED_OUTLINE_COLOR, width: 1.5 }
      }
      return null
    },
    roomClasses (room) {
      return {
        'audio-plan-room--unavailable': !room.available,
        'audio-plan-room--grouped': room.grouped || room.pinned,
        'audio-plan-room--pinned': room.pinned,
        'audio-plan-room--linked': room.lightLinked,
        'audio-plan-room--manual-muted': room.manualMuted,
        'audio-plan-room--light-muted': room.lightMuted,
        'audio-plan-room--pressed': !!this.pressed && this.pressed.room.id === room.id
      }
    },
    levelOf (room) {
      return this.levels.shown(this.levelKey(room), room.volume)
    },
    markStyle (geometry) {
      return {
        left: `${geometry.centroid.x / PLAN_WIDTH * 100}%`,
        top: `${geometry.centroid.y / PLAN_HEIGHT * 100}%`
      }
    },
    nameFits (r) {
      return r.room.name.length * CHAR_PX <= r.geometry.box.width * this.scale
    },
    chipStyle (room) {
      return { '--audio-plan-chip-color': this.fillOf(room) }
    },

    press (room, event) {
      if (this.disabled || this.pressed || (event.button !== undefined && event.button > 0)) {
        return
      }
      this.pressed = {
        room,
        pointerId: event.pointerId,
        x0: event.clientX,
        y0: event.clientY,
        x: event.clientX,
        y: event.clientY,
        start: room.volume,
        moved: false,
        level: null
      }
      window.addEventListener('pointermove', this.onMove)
      window.addEventListener('pointerup', this.onUp)
      window.addEventListener('pointercancel', this.onCancel)
    },
    onMove (event) {
      const p = this.pressed
      if (!p || event.pointerId !== p.pointerId) {
        return
      }
      p.x = event.clientX
      p.y = event.clientY
      const dy = event.clientY - p.y0
      if (!p.moved && Math.hypot(event.clientX - p.x0, dy) > DRAG_THRESHOLD_PX) {
        p.moved = true
        if (this.tool === 'volume' && p.room.available && p.start !== null) {
          p.level = p.start
          this.levels.start(this.levelKey(p.room), p.start)
        }
      }
      if (p.moved && p.level !== null) {
        const level = Math.max(0, Math.min(100, Math.round(p.start - dy / PX_PER_LEVEL)))
        if (level !== p.level) {
          p.level = level
          this.levels.move(this.levelKey(p.room), level)
        }
      }
    },
    onUp (event) {
      const p = this.pressed
      if (!p || event.pointerId !== p.pointerId) {
        return
      }
      this.endPress()
      // the room as the state has it now, not as it was on press
      const room = this.state.rooms.find(r => r.id === p.room.id) || p.room
      if (p.level !== null) {
        this.levels.finish(this.levelKey(room), p.level, call => this.runAudioCommand(call))
      } else if (!p.moved) {
        this.tap(room)
      }
    },
    onCancel (event) {
      const p = this.pressed
      if (!p || event.pointerId !== p.pointerId) {
        return
      }
      this.cancelPress()
    },
    /** A press ended without its release: a drag in progress keeps the level reached. */
    cancelPress () {
      const p = this.pressed
      if (!p) {
        return
      }
      this.endPress()
      if (p.level !== null) {
        this.levels.finish(this.levelKey(p.room), p.level, call => this.runAudioCommand(call))
      }
    },
    endPress () {
      this.pressed = null
      window.removeEventListener('pointermove', this.onMove)
      window.removeEventListener('pointerup', this.onUp)
      window.removeEventListener('pointercancel', this.onCancel)
    },
    tap (room) {
      if (!room.available || this.disabled) {
        return
      }
      const id = room.id
      switch (this.tool) {
        case 'overview':
          this.$emit('focus-stream', this.streamKeyOf(room))
          break
        case 'mute':
          this.send('mute', room, () => audioService.setRoomManualMuted(id, !room.manualMuted))
          break
        case 'group':
          if (!room.pinned) {
            this.send('group', room, () => audioService.setRoomGrouped(id, !room.grouped))
          }
          break
        case 'light':
          this.send('light', room, () => audioService.setRoomLightLinked(id, !room.lightLinked))
          break
        default:
          // Volume: a tap without movement sends nothing
          break
      }
    },
    async send (tool, room, call) {
      const key = `${tool}:${room.id}`
      if (this.pending[key]) {
        return
      }
      this.$set(this.pending, key, true)
      try {
        await this.runAudioCommand(call)
      } finally {
        this.$delete(this.pending, key)
      }
    },
    measure () {
      if (this.$refs.map) {
        this.width = this.$refs.map.getBoundingClientRect().width
      }
    }
  },

  created () {
    // not reactive: the Volume tool's live senders and holds, per room
    this.levels = createHeldLevels(key => {
      const roomId = key.substring('room:'.length)
      const room = this.state.rooms.find(r => `${r.id}` === roomId)
      const id = room ? room.id : roomId
      return level => audioService.setRoomVolume(id, level)
    })
  },

  mounted () {
    this.measure()
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.measure())
      this.resizeObserver.observe(this.$refs.map)
    } else {
      window.addEventListener('resize', this.measure)
    }
  },

  beforeDestroy () {
    this.cancelPress()
    this.levels.destroy()
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    } else {
      window.removeEventListener('resize', this.measure)
    }
  }
}
</script>

<style lang="scss">
.audio-plan-map {
  position: relative;
  width: 100%;
  flex: 0 0 auto;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  &.audio-plan-map--volume {
    .audio-plan-map-svg,
    .audio-plan-chip {
      touch-action: none;
    }
  }
}

// The plan keeps the image's 1276 x 464 ratio at any width.
.audio-plan-map-canvas {
  position: relative;
  width: 100%;
  padding-top: #{464 / 1276 * 100%};
}

.audio-plan-map-image,
.audio-plan-map-svg,
.audio-plan-marks {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.audio-plan-map-image {
  display: block;
  pointer-events: none;
}

.audio-plan-map-svg {
  overflow: visible;

  .audio-plan-halo {
    pointer-events: all;
    cursor: pointer;
  }

  .audio-plan-room-area {
    cursor: pointer;
    transition: fill 0.3s, fill-opacity 0.3s;
  }

  .audio-plan-room-level,
  .audio-plan-room-hatch,
  .audio-plan-room-outline {
    pointer-events: none;
  }

  .audio-plan-room--unavailable .audio-plan-room-hatch {
    opacity: 0.5;
  }
}

.audio-plan-map--mute .audio-plan-marks {
  opacity: 0.5;
}

.audio-plan-marks {
  pointer-events: none;
}

.audio-plan-mark {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  white-space: nowrap;
  color: #212121;

  &.audio-plan-room--unavailable {
    opacity: 0.5;
  }
}

.audio-plan-mark-name {
  font-size: 12px;
  font-weight: 500;
  line-height: 14px;
  padding: 0 3px;
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.7);
}

.audio-plan-mark-bulb.v-icon {
  color: #FFB300 !important;
  text-shadow: 0 0 2px #000;
}

.audio-plan-mark-pin.v-icon {
  color: #263238 !important;
  text-shadow: 0 0 2px #fff;
}

.audio-plan-mark-level {
  font-size: 15px;
  font-weight: 700;
  line-height: 18px;
  padding: 0 4px;
  border-radius: 3px;
  font-variant-numeric: tabular-nums;
  background-color: rgba(255, 255, 255, 0.8);
  color: #212121;
}

// Chips: rooms without an area, in a column over the plan's empty bottom-right
// corner, or every room in a wrapping list when there is no plan at all.
.audio-plan-chips {
  position: absolute;
  right: 6px;
  bottom: 6px;
  top: 6px;
  display: flex;
  flex-direction: column-reverse;
  flex-wrap: wrap-reverse;
  align-items: flex-end;
  align-content: flex-start;
  gap: 4px;
  pointer-events: none;

  &.audio-plan-chips--all {
    left: 6px;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: flex-start;
    overflow-y: auto;
  }
}

.audio-plan-chips-note {
  flex: 0 0 100%;
  font-size: 12px;
  opacity: 0.7;
}

.audio-plan-chip {
  position: relative;
  display: flex;
  align-items: center;
  height: 36px;
  min-width: 64px;
  max-width: 180px;
  padding: 0 10px;
  overflow: hidden;
  border-radius: 18px;
  pointer-events: auto;
  cursor: pointer;
  color: #212121;
  background-color: var(--audio-plan-chip-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);

  .audio-plan-map--volume &,
  .audio-plan-map--mute & {
    background-color: transparent;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background-color: var(--audio-plan-chip-color);
      opacity: 0.45;
    }
  }

  &.audio-plan-room--unavailable {
    opacity: 0.45;
  }

  &.audio-plan-room--pressed {
    box-shadow: 0 0 0 2px #fff;
  }

  .audio-plan-map--light &.audio-plan-room--linked {
    box-shadow: inset 0 0 0 3px #FFB300;
  }

  .audio-plan-map--light &:not(.audio-plan-room--linked) {
    opacity: 0.5;
  }

  .audio-plan-map--group &.audio-plan-room--grouped {
    box-shadow: inset 0 0 0 1.5px #ECEFF1, 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  > * {
    position: relative;
  }
}

// on a pill of its own, so it stays readable over hatching and dimmed fills
.audio-plan-chip-name {
  font-size: 13px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 4px;
  padding: 0 4px;
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.75);
}

.audio-plan-chip-level {
  position: absolute !important;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--audio-plan-chip-color);
  opacity: 0.9;
}

.audio-plan-chip-hatch {
  position: absolute !important;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;

  // `╱`: stripes across a gradient running to the bottom right
  &.audio-plan-chip-hatch--manual {
    background-image: repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0 1px, var(--audio-plan-chip-color) 1px 2.5px, transparent 2.5px 6px);
  }

  // `╲`
  &.audio-plan-chip-hatch--light {
    background-image: repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.5) 0 1px, var(--audio-plan-chip-color) 1px 2.5px, transparent 2.5px 6px);
  }

  &.audio-plan-chip-hatch--manual.audio-plan-chip-hatch--light {
    background-image:
      repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.5) 0 1px, var(--audio-plan-chip-color) 1px 2.5px, transparent 2.5px 6px),
      repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0 1px, var(--audio-plan-chip-color) 1px 2.5px, transparent 2.5px 6px);
  }

  .audio-plan-map--mute & {
    filter: contrast(1.6);
  }
}

// The name next to the finger while a room is pressed; with the Volume tool
// dragging, the level large beside it.
.audio-plan-finger {
  position: fixed;
  z-index: 10;
  transform: translate(-100%, -50%) translateX(-28px);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  padding: 2px 8px;
  border-radius: 6px;
  color: #fff;
  background-color: rgba(33, 33, 33, 0.85);
  white-space: nowrap;

  &.audio-plan-finger--right {
    transform: translate(0, -50%) translateX(28px);
  }

  &.audio-plan-finger--level {
    min-width: 48px;
    min-height: 48px;
    justify-content: center;
  }
}

.audio-plan-finger-level {
  font-size: 24px;
  font-weight: 700;
  line-height: 28px;
  font-variant-numeric: tabular-nums;
}

.audio-plan-finger-name {
  font-size: 12px;
  line-height: 15px;
}
</style>
