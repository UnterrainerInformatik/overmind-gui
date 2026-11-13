import { AudioLightRef, AudioRoom } from '@/utils/webservices/audioService'

/**
 * The audio plan popup's room geometry (openspec change
 * `kiosk-audio-plan-popup`, design D3/D4): every audio room is the set of its
 * lights' plan areas, taken from the appliance list the lights plan reads too.
 * All coordinates are full plan-image pixels (1276 x 464, `Floorplan.vue`).
 *
 * - a whole appliance gives `imgMapCoords` and, when present, `imgMapCoords1`;
 * - channel 0 gives `imgMapCoords`, channel 1 `imgMapCoords1`, any other nothing;
 * - a group (`GROUP_PARALLEL` / `GROUP_SERIAL`) with coords of its own gives
 *   those, one without them its members' areas by the same rules;
 * - an area claimed by two rooms belongs to the first room in state order.
 */

export const PLAN_WIDTH = 1276
export const PLAN_HEIGHT = 464
/** A room smaller than this on screen (either side) gets a tap halo. */
export const MIN_TOUCH_PX = 44

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any

export interface PlanAppliance {
  id: number;
  group: boolean;
  memberIds: number[];
  /** `imgMapCoords` / `imgMapCoords1` as flat [x, y, x, y, ...], null when absent */
  coords: Array<number[] | null>;
}

export interface PlanPolygon {
  /** `<applianceId>:<area index>`, unique across the plan */
  key: string;
  /** flat [x, y, x, y, ...] */
  points: number[];
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoomGeometry {
  polygons: PlanPolygon[];
  box: Box;
  /** centroid of the room's largest polygon */
  centroid: { x: number; y: number };
}

/** Like `Floorplan.parseNumberArray`, also taking an array; null for fewer than three points. */
export function parsePolygon (raw: unknown): number[] | null {
  let values: unknown[]
  if (Array.isArray(raw)) {
    values = raw
  } else if (typeof raw === 'string') {
    values = raw.split(',').map(x => x.trim()).filter(x => x.length > 0)
  } else {
    return null
  }
  const numbers = values.map(Number).filter(n => isFinite(n))
  if (numbers.length !== values.length || numbers.length < 6) {
    return null
  }
  return numbers.length % 2 === 0 ? numbers : numbers.slice(0, -1)
}

function configOf (a: Raw): Raw {
  if (a && typeof a.config === 'string') {
    try {
      return JSON.parse(a.config)
    } catch {
      return {}
    }
  }
  return a && a.config && typeof a.config === 'object' ? a.config : {}
}

/** The appliance list (`appliancesService.getList().entries`) indexed for the plan. */
export function indexAppliances (entries: Raw[]): Map<number, PlanAppliance> {
  const index = new Map<number, PlanAppliance>()
  ;(Array.isArray(entries) ? entries : []).forEach(a => {
    const id = Number(a && a.id)
    if (!Number.isInteger(id)) {
      return
    }
    const type = `${a.type || ''}`.toUpperCase()
    const group = type === 'GROUP_PARALLEL' || type === 'GROUP_SERIAL'
    const ids = configOf(a).applianceIds
    index.set(id, {
      id,
      group,
      memberIds: group && Array.isArray(ids) ? ids.map(Number).filter(n => Number.isInteger(n)) : [],
      coords: [parsePolygon(a.imgMapCoords), parsePolygon(a.imgMapCoords1)]
    })
  })
  return index
}

function collect (index: Map<number, PlanAppliance>, id: number, channel: number | null, seen: Set<number>, out: PlanPolygon[]) {
  const app = index.get(id)
  if (!app || seen.has(id)) {
    return
  }
  seen.add(id)
  const own = app.coords
    .map((points, i) => ({ key: `${id}:${i}`, points, i }))
    .filter(p => p.points !== null && (channel === null || p.i === channel))
  if (app.group && !app.coords.some(c => c !== null)) {
    app.memberIds.forEach(member => collect(index, member, channel, seen, out))
    return
  }
  own.forEach(p => out.push({ key: p.key, points: p.points as number[] }))
}

/** A room's polygons from its light entries, before the first-room-wins rule. */
export function polygonsOf (index: Map<number, PlanAppliance>, lights: AudioLightRef[]): PlanPolygon[] {
  const out: PlanPolygon[] = []
  lights.forEach(ref => {
    if (ref.channel !== null && ref.channel > 1) {
      return
    }
    collect(index, ref.applianceId, ref.channel, new Set<number>(), out)
  })
  const keys = new Set<string>()
  return out.filter(p => !keys.has(p.key) && !!keys.add(p.key))
}

function signedArea (p: number[]): number {
  let a = 0
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length
    a += p[i] * p[j + 1] - p[j] * p[i + 1]
  }
  return a / 2
}

export function centroidOf (p: number[]): { x: number; y: number } {
  const a = signedArea(p)
  if (Math.abs(a) < 1e-9) {
    let x = 0
    let y = 0
    for (let i = 0; i < p.length; i += 2) {
      x += p[i]
      y += p[i + 1]
    }
    const n = p.length / 2
    return { x: x / n, y: y / n }
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length
    const f = p[i] * p[j + 1] - p[j] * p[i + 1]
    cx += (p[i] + p[j]) * f
    cy += (p[i + 1] + p[j + 1]) * f
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

export function boxOf (polygons: PlanPolygon[]): Box {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  polygons.forEach(({ points }) => {
    for (let i = 0; i < points.length; i += 2) {
      minX = Math.min(minX, points[i])
      maxX = Math.max(maxX, points[i])
      minY = Math.min(minY, points[i + 1])
      maxY = Math.max(maxY, points[i + 1])
    }
  })
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Every room's geometry, keyed by `${room.id}`. A room without any polygon left
 * after the first-room-wins rule is missing from the map and becomes a chip.
 */
export function layoutRooms (rooms: AudioRoom[], index: Map<number, PlanAppliance>): Map<string, RoomGeometry> {
  const claimed = new Set<string>()
  const result = new Map<string, RoomGeometry>()
  rooms.forEach(room => {
    const polygons = polygonsOf(index, room.lights).filter(p => !claimed.has(p.key))
    polygons.forEach(p => claimed.add(p.key))
    if (polygons.length === 0) {
      return
    }
    const largest = polygons.reduce((a, b) => (Math.abs(signedArea(b.points)) > Math.abs(signedArea(a.points)) ? b : a))
    result.set(`${room.id}`, { polygons, box: boxOf(polygons), centroid: centroidOf(largest.points) })
  })
  return result
}

/** True when the room is smaller than MIN_TOUCH_PX on screen on either side. */
export function isSmallOnScreen (geometry: RoomGeometry, scale: number): boolean {
  return geometry.box.width * scale < MIN_TOUCH_PX || geometry.box.height * scale < MIN_TOUCH_PX
}
