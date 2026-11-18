// Pure helpers for the kiosk weather (zamg) panel. No imports on purpose, so
// tests/unit/run.js can load this file in plain node.

export const STALE_AFTER_MS = 30 * 60 * 1000

export type FreshnessState = 'fresh' | 'stale' | 'unknown'

export interface Freshness {
  state: FreshnessState;
  measuredAt: Date | null;
}

/**
 * Decides whether an observation is still current. The clock is passed in as
 * `nowMs` so the decision can be tested without patching `Date.now`.
 * A timestamp in the future counts as fresh.
 */
export function weatherFreshness (measuredOn: unknown, nowMs: number): Freshness {
  if (typeof measuredOn !== 'string' || measuredOn === '') {
    return { state: 'unknown', measuredAt: null }
  }
  const measured = Date.parse(measuredOn)
  if (isNaN(measured)) {
    return { state: 'unknown', measuredAt: null }
  }
  return {
    state: nowMs - measured > STALE_AFTER_MS ? 'stale' : 'fresh',
    measuredAt: new Date(measured)
  }
}

export interface RainAmount {
  value: number | null;
  unit: string;
}

function isNumber (v: unknown): v is number {
  return typeof v === 'number' && isFinite(v)
}

/**
 * Rain over the last hour when available, else the last 10-minute slot.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rainAmount (weather: any): RainAmount {
  if (!weather) {
    return { value: null, unit: '' }
  }
  if (isNumber(weather.rainLastHour)) {
    return { value: weather.rainLastHour, unit: weather.rainLastHourUnit || weather.rainUnit || ' mm' }
  }
  if (isNumber(weather.rain)) {
    return { value: weather.rain, unit: weather.rainUnit || ' mm' }
  }
  return { value: null, unit: '' }
}

/**
 * True when part of the current 10-minute slot had precipitation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRaining (weather: any): boolean {
  return !!weather && typeof weather.rainDuration === 'number' && weather.rainDuration > 0
}
