import { AudioRoom } from '@/utils/webservices/audioService'

/*
 * Helpers for the audio plan popup's EQ tool (openspec change
 * `kiosk-audio-plan-eq-tool`, design D3).
 */

/**
 * Whether the EQ tool marks a room and opens its panel: it has bands or a
 * crossover, or has one that cannot be read right now. A room with `none`
 * (also an older server, which sends no `eq`) has no EQ.
 */
export function hasEq (room: AudioRoom): boolean {
  return room.eq === 'bands' || room.eq === 'crossover' || room.eq === 'unavailable'
}

/** Whether the room's EQ can be read and written right now. */
export function eqReachable (room: AudioRoom): boolean {
  return room.eq === 'bands' || room.eq === 'crossover'
}

/** `31.5`, `80`, `1.25k`, `16k`. */
export function eqFrequencyLabel (frequency: number): string {
  if (frequency < 1000) {
    return `${frequency}`
  }
  return `${parseFloat((frequency / 1000).toFixed(2))}k`
}

/** The key of a band in a `PUT` body: `"31.5"`, `"16000"`. */
export function eqBandKey (frequency: number): string {
  return String(frequency)
}
