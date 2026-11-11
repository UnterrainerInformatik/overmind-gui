/**
 * Sends a slider's level live while it is dragged (openspec change `kiosk-live-volume`,
 * design.md D1). `createLiveSender(send, intervalMs)` wraps one `send(level)` call - e.g. one
 * volume endpoint for one target or room - and guarantees:
 *
 * - Rate limit: no two `send` calls start less than `intervalMs` apart.
 * - Serialisation: at most one `send` is in flight at a time, so the server sees the levels in
 *   the order they were sent and an older level can never be applied last.
 * - Trailing level: levels passed over while a request is in flight or within the interval are
 *   dropped, except the newest one, which is sent as soon as both allow it.
 * - No duplicate: a level equal to the last level sent successfully is not sent again.
 *
 * `push(level)` is called on every move while dragging; its requests are silent - a failure is
 * swallowed (design.md D2). `flush(level, wrap)` is called on release: it makes `level` the last
 * level sent (waiting for the request in flight first, and sending nothing when it already was
 * the last one sent) and resolves with the success of that final call. The final call goes
 * through `wrap`, so the caller can report its failure (e.g. `call => this.runAudioCommand(call)`).
 * A newer `flush` supersedes one that has not started yet; the superseded one resolves `true`.
 * A `flush` of the level that is already being flushed joins it and resolves `true` at once, so
 * a release that fires two events sends (and reports) the level once even when it fails.
 * `cancel()` stops all pending work (target switch, component destroyed); a request already in
 * flight still completes, but nothing follows it, and a pending `flush` resolves `true`.
 *
 * The project has no unit-test setup; these properties are verified in the browser by watching
 * the network while dragging (tasks.md 4.2/4.3).
 */

export type FinalWrap = (call: () => Promise<unknown>) => Promise<boolean>

export interface LiveSender {
  push: (level: number) => void;
  flush: (level: number, wrap?: FinalWrap) => Promise<boolean>;
  cancel: () => void;
}

interface FinalRequest {
  level: number;
  wrap: FinalWrap;
  resolve: (ok: boolean) => void;
}

const silently: FinalWrap = call => call().then(() => true, () => false)

export function createLiveSender (send: (level: number) => Promise<unknown>, intervalMs = 200): LiveSender {
  let pending: number | null = null
  let final: FinalRequest | null = null
  let lastSent: number | null = null
  let lastStart = -Infinity
  let inFlight = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let cancelled = false
  // the level of the final call in flight, so a second flush of it (`end` + `change`) joins it
  let finalInFlight: number | null = null

  function settleFinal (ok: boolean) {
    if (final !== null) {
      const f = final
      final = null
      f.resolve(ok)
    }
  }

  function pump () {
    if (cancelled || inFlight || timer !== null) {
      return
    }
    const level = final !== null ? final.level : pending
    if (level === null) {
      return
    }
    if (level === lastSent) {
      pending = null
      settleFinal(true)
      return
    }
    const wait = lastStart + intervalMs - Date.now()
    if (wait > 0) {
      timer = setTimeout(() => {
        timer = null
        pump()
      }, wait)
      return
    }
    lastStart = Date.now()
    pending = null
    inFlight = true
    const done = (ok: boolean) => {
      if (ok) {
        lastSent = level
      }
      inFlight = false
      pump()
    }
    if (final !== null) {
      const f = final
      final = null
      finalInFlight = level
      Promise.resolve()
        .then(() => f.wrap(() => send(level)))
        .catch(() => false)
        .then(ok => {
          finalInFlight = null
          done(ok)
          f.resolve(ok)
        })
    } else {
      Promise.resolve()
        .then(() => send(level))
        .then(() => done(true), () => done(false))
    }
  }

  return {
    push (level: number) {
      pending = level
      pump()
    },
    flush (level: number, wrap: FinalWrap = silently) {
      return new Promise<boolean>(resolve => {
        if (cancelled || level === finalInFlight || (final !== null && final.level === level)) {
          // nothing to do, or that very level is already being flushed
          resolve(true)
          return
        }
        settleFinal(true)
        pending = null
        final = { level, wrap, resolve }
        pump()
      })
    },
    cancel () {
      cancelled = true
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      pending = null
      settleFinal(true)
    }
  }
}
