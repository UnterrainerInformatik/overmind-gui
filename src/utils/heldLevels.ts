import Vue from 'vue'
import { createLiveSender, FinalWrap, LiveSender } from '@/utils/liveSender'

/** How long a released control keeps its level while no state reports it. */
export const HOLD_MS = 3000

/**
 * Live volume for a set of controls, keyed by the caller (`room:<id>`,
 * `target:<targetId>`), moved here from the former target list popup
 * (openspec change `kiosk-audio-plan-popup`, design D6; the rules are
 * `kiosk-audio-bar`'s "Live volume while dragging"):
 *
 * - while dragged a control shows the level under the finger and sends it
 *   through one live sender per key;
 * - on release it makes the released level the last one sent and holds it
 *   until `observe` sees the state report that level, or HOLD_MS pass, so
 *   echoes of levels sent during the drag do not move it back.
 *
 * `sendFor(key)` returns the request for one level of that control.
 */
export interface HeldLevels {
  /** the level to show: dragged, else held, else the state's */
  shown (key: string, stateLevel: number | null): number | null;
  dragging (key: string): boolean;
  start (key: string, level: number): void;
  move (key: string, level: number): void;
  finish (key: string, level: number, wrap?: FinalWrap): Promise<boolean>;
  /** a state arrived reporting `stateLevel` for that control */
  observe (key: string, stateLevel: number | null): void;
  destroy (): void;
}

export function createHeldLevels (sendFor: (key: string) => (level: number) => Promise<unknown>): HeldLevels {
  const levels = Vue.observable({
    dragged: {} as Record<string, number>,
    held: {} as Record<string, number>
  })
  const timers: Record<string, ReturnType<typeof setTimeout>> = {}
  const senders: Record<string, LiveSender> = {}

  const senderOf = (key: string): LiveSender => {
    if (!senders[key]) {
      senders[key] = createLiveSender(sendFor(key))
    }
    return senders[key]
  }

  const clearHold = (key: string) => {
    if (timers[key] !== undefined) {
      clearTimeout(timers[key])
      delete timers[key]
    }
    if (levels.held[key] !== undefined) {
      Vue.delete(levels.held, key)
    }
  }

  return {
    shown (key, stateLevel) {
      if (levels.dragged[key] !== undefined) {
        return levels.dragged[key]
      }
      if (levels.held[key] !== undefined) {
        return levels.held[key]
      }
      return stateLevel
    },
    dragging (key) {
      return levels.dragged[key] !== undefined
    },
    start (key, level) {
      Vue.set(levels.dragged, key, level)
    },
    move (key, level) {
      if (levels.dragged[key] !== undefined) {
        Vue.set(levels.dragged, key, level)
        senderOf(key).push(level)
      }
    },
    finish (key, level, wrap) {
      if (levels.dragged[key] !== undefined) {
        Vue.delete(levels.dragged, key)
      }
      clearHold(key)
      Vue.set(levels.held, key, level)
      timers[key] = setTimeout(() => clearHold(key), HOLD_MS)
      return senderOf(key).flush(level, wrap)
    },
    observe (key, stateLevel) {
      if (levels.held[key] !== undefined && stateLevel === levels.held[key]) {
        clearHold(key)
      }
    },
    destroy () {
      Object.values(senders).forEach(sender => sender.cancel())
      Object.keys(timers).forEach(key => clearHold(key))
    }
  }
}
