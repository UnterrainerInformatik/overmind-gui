import { AudioRoom } from '@/utils/webservices/audioService'

/**
 * Whether the audio plan popup's Balance tool works on a room (openspec change
 * `kiosk-audio-plan-balance-tool`, design D3a): the server says so and there
 * are at least two speakers to balance. An older server sends neither field,
 * which reads as no balance.
 */
export function hasBalance (room: AudioRoom): boolean {
  return room.balanceSupported && room.speakers.length >= 2
}
