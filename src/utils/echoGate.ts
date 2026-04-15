/**
 * EchoGate guards a user-editable control's local model against being
 * overwritten by stale polled state while a command is in flight to the
 * backend. See openspec/changes/fix-dimmer-slider-feedback-loop/ for the
 * full rationale; the short version is: "any app change releases the gate"
 * races an unrelated mutation ahead of the real echo on slow tablets, so
 * this helper releases the gate only on a matching echo of the just-sent
 * values, or after a bounded timeout.
 */

export interface EchoGateOptions<T> {
  read: (app: any) => T | null;
  matches: (sent: T, incoming: T) => boolean;
  timeout?: number;
  debugLabel?: string;
}

export class EchoGate<T> {
  private readonly opts: EchoGateOptions<T>
  private readonly timeout: number
  private interacting = false
  private sent: T | null = null
  private timer: any | null = null

  public constructor (opts: EchoGateOptions<T>) {
    this.opts = opts
    this.timeout = opts.timeout !== undefined ? opts.timeout : 3000
  }

  public isInFlight (): boolean {
    return this.interacting || this.sent !== null
  }

  public holdForInteraction (): void {
    this.interacting = true
  }

  public releaseInteraction (): void {
    this.interacting = false
  }

  public register (sent: T): void {
    this.sent = sent
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.timer = setTimeout(() => this.forceRelease(), this.timeout)
  }

  public read (app: any): T | null {
    return this.opts.read(app)
  }

  public observe (app: any): boolean {
    if (this.sent === null) {
      return false
    }
    const incoming = this.opts.read(app)
    if (incoming === null || incoming === undefined) {
      return false
    }
    if (this.opts.matches(this.sent, incoming)) {
      this.sent = null
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
      return true
    }
    return false
  }

  public destroy (): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.sent = null
    this.interacting = false
  }

  private forceRelease (): void {
    this.sent = null
    this.timer = null
    // eslint-disable-next-line no-console
    console.warn(
      'EchoGate[' + (this.opts.debugLabel || 'unlabeled') + ']: ' +
      'released via timeout (' + this.timeout + 'ms) — no matching echo arrived. ' +
      'This is expected on slow/disconnected links; if it fires on a healthy link, ' +
      'either the tolerance is too tight or the read/matches config is wrong.'
    )
  }
}

/**
 * Float-tolerance matcher for composite numeric echoes. Returns a function
 * that checks every own-enumerable key of `sent` is within `tolerance` of
 * the corresponding key in `incoming`. Use for single scalars by wrapping
 * them in `{ value: x }`, or directly for object shapes like `{ r, g, b }`.
 *
 * The default tolerance of 0.005 is 0.5% of the backend's 0–1 scale, well
 * above float round-trip noise and well below the slider's 0.01 step, so
 * intermediate slider positions cannot be mistaken for echoes.
 */
export function floatEchoMatcher (tolerance = 0.005) {
  return function matches (sent: any, incoming: any): boolean {
    if (sent === null || incoming === null) {
      return false
    }
    if (typeof sent === 'number' && typeof incoming === 'number') {
      return Math.abs(sent - incoming) <= tolerance
    }
    for (const k of Object.keys(sent)) {
      const s = sent[k]
      const i = incoming[k]
      if (typeof s !== 'number' || typeof i !== 'number') {
        return false
      }
      if (Math.abs(s - i) > tolerance) {
        return false
      }
    }
    return true
  }
}
