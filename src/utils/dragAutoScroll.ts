/**
 * Edge-zone auto-scroll for a drag inside a scrolling list (openspec change
 * `kiosk-playlist-editor-extras`, design D6), used on top of SortableJS with
 * its own auto-scroll turned off and in fallback mode.
 *
 * While started it follows the last pointer position and scrolls `scrollEl`
 * when that position is within an edge zone at the top or bottom. The speed
 * grows quadratically with the depth into the zone,
 * `v = V_MIN + (V_MAX - V_MIN) * d^2` px/s, and is recomputed every frame from
 * the pointer (no momentum), so it stops at once when the pointer leaves the
 * zone. The step is time-based, so the frame rate does not matter. After each
 * frame that scrolled, a synthetic move event at the last position lets
 * SortableJS re-evaluate the row under the finger.
 *
 * The constants were tried on the wall tablet: 300 tracks x 56 px are crossed
 * in about 7 s at full depth.
 */
const EDGE_ZONE_RATIO = 0.15
const EDGE_ZONE_MIN = 48
const EDGE_ZONE_MAX = 120
const V_MIN = 150
const V_MAX = 2500
// Only guards against stalls (e.g. a hidden tab); slow devices still get the full speed.
const MAX_FRAME_DT = 0.2

export interface AutoScroller {
  /** Starts following the pointer; `x`/`y` is where it is now, when known. */
  start (x?: number, y?: number): void;
  stop (): void;
}

const MOVE_EVENTS = ['pointermove', 'touchmove', 'mousemove']
const LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true }

function clamp (value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function createAutoScroller (scrollEl: HTMLElement): AutoScroller {
  let running = false
  let raf: number | null = null
  let lastTs: number | null = null
  let carry = 0
  let x: number | null = null
  let y: number | null = null
  let dispatching = false

  const onMove = (event: Event): void => {
    if (dispatching) {
      return
    }
    const e = event as TouchEvent & MouseEvent
    const point = e.touches && e.touches.length > 0 ? e.touches[0] : e
    if (typeof point.clientY === 'number') {
      x = point.clientX
      y = point.clientY
    }
  }

  const nudgeSortable = (): void => {
    if (x === null || y === null) {
      return
    }
    const init = { clientX: x, clientY: y, bubbles: true, cancelable: true }
    // SortableJS listens to pointermove where PointerEvent exists (its
    // `supportPointer` default), else to mousemove/touchmove.
    const event = typeof window.PointerEvent === 'function'
      ? new PointerEvent('pointermove', { ...init, pointerId: 1, isPrimary: true })
      : new MouseEvent('mousemove', init)
    dispatching = true
    try {
      document.dispatchEvent(event)
    } finally {
      dispatching = false
    }
  }

  const frame = (ts: number): void => {
    if (!running) {
      return
    }
    const dt = lastTs === null ? 0 : Math.min((ts - lastTs) / 1000, MAX_FRAME_DT)
    lastTs = ts
    let scrolled = false
    if (y !== null && dt > 0) {
      const rect = scrollEl.getBoundingClientRect()
      const zone = clamp(rect.height * EDGE_ZONE_RATIO, EDGE_ZONE_MIN, EDGE_ZONE_MAX)
      let direction = 0
      let depth = 0
      if (y < rect.top + zone) {
        direction = -1
        depth = (rect.top + zone - y) / zone
      } else if (y > rect.bottom - zone) {
        direction = 1
        depth = (y - (rect.bottom - zone)) / zone
      }
      depth = clamp(depth, 0, 1)
      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight
      const atEnd = (direction < 0 && scrollEl.scrollTop <= 0) || (direction > 0 && scrollEl.scrollTop >= maxScroll - 1)
      if (direction !== 0 && !atEnd) {
        const speed = V_MIN + (V_MAX - V_MIN) * depth * depth
        // scrollTop may round to device pixels; carry the fraction so slow speeds still move.
        const delta = direction * speed * dt + carry
        const before = scrollEl.scrollTop
        scrollEl.scrollTop = clamp(before + delta, 0, maxScroll)
        const moved = scrollEl.scrollTop - before
        carry = Math.abs(delta - moved) > 1 ? 0 : delta - moved
        scrolled = moved !== 0
      } else {
        carry = 0
      }
    }
    if (scrolled) {
      nudgeSortable()
    }
    raf = requestAnimationFrame(frame)
  }

  return {
    start (startX?: number, startY?: number) {
      if (running) {
        return
      }
      running = true
      lastTs = null
      carry = 0
      x = typeof startX === 'number' ? startX : null
      y = typeof startY === 'number' ? startY : null
      MOVE_EVENTS.forEach(name => document.addEventListener(name, onMove, LISTENER_OPTIONS))
      raf = requestAnimationFrame(frame)
    },
    stop () {
      if (!running) {
        return
      }
      running = false
      MOVE_EVENTS.forEach(name => document.removeEventListener(name, onMove, LISTENER_OPTIONS))
      if (raf !== null) {
        cancelAnimationFrame(raf)
        raf = null
      }
      x = null
      y = null
    }
  }
}
