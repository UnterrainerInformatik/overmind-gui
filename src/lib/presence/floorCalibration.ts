const STORAGE_KEY = 'overmind.presence.pxPerMeter'

const DEFAULT_PX_PER_METER = 39.06

export function pxPerMeter (): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_PX_PER_METER
}

export function setPxPerMeter (value: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // ignore — calibration just won't persist
  }
}
