import { AudioState, AudioPlayback, MAIN_GROUP_COLOR, WEB_PLAYER_COLOR } from '@/utils/webservices/audioService'

/**
 * The device's audio target: what the kiosk audio bar controls and what the
 * playlist editor plays on (openspec changes `kiosk-audio-bar`, design D5, and
 * `kiosk-playlist-editor-extras`, design D3).
 *
 * The stored selection is 'main' or 'room:<roomId>'. The room id rather than
 * the target id is stored, because the id a solo room is addressed by is MA's
 * and is not ours to keep.
 *
 * A web player (openspec change `audio-web-player-targets`, design D2) is
 * stored as 'player:<targetId>': it has no other identity, and MA keeps that id
 * stable per browser profile.
 */
const STORAGE_KEY = 'kioskAudioTarget'

export interface AudioTarget {
  key: string;
  kind: 'main' | 'room' | 'player';
  targetId: string;
  roomId: string | number | null;
  name: string;
  color: string;
  playback: AudioPlayback | null;
  volume: number | null;
}

export function readStoredTarget (): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'main' || (raw && (raw.startsWith('room:') || raw.startsWith('player:')))) {
      return raw
    }
  } catch {
    // storage blocked - the main group it is
  }
  return 'main'
}

export function writeStoredTarget (value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // ignore - the choice then lasts for this page session only
  }
}

/**
 * The selected room while it may be a target of its own (available, not
 * grouped, with a target id), else null.
 */
export function selectedRoomOf (state: AudioState | null, selection: string) {
  if (!state || !selection.startsWith('room:')) {
    return null
  }
  const id = selection.substring('room:'.length)
  const room = state.rooms.find(r => `${r.id}` === id)
  return room && room.available && !room.grouped && room.targetId ? room : null
}

/**
 * The selected web player while it is in the state and available, else null.
 */
export function selectedPlayerOf (state: AudioState | null, selection: string) {
  if (!state || !selection.startsWith('player:')) {
    return null
  }
  const id = selection.substring('player:'.length)
  const player = state.players.find(p => p.targetId === id)
  return player && player.available ? player : null
}

/**
 * The selection resolved against the state: the room or web player while it
 * may be one, else the main group. Null while no state is known.
 */
export function resolveTarget (state: AudioState | null, selection: string, mainGroupName: string): AudioTarget | null {
  if (!state) {
    return null
  }
  const room = selectedRoomOf(state, selection)
  if (room && room.targetId) {
    return {
      key: `room:${room.id}`,
      kind: 'room',
      targetId: room.targetId,
      roomId: room.id,
      name: room.name,
      color: room.color,
      playback: room.playback,
      volume: room.volume
    }
  }
  const player = selectedPlayerOf(state, selection)
  if (player) {
    return {
      key: `player:${player.targetId}`,
      kind: 'player',
      targetId: player.targetId,
      roomId: null,
      name: player.name,
      color: WEB_PLAYER_COLOR,
      playback: player.playback,
      volume: player.volume
    }
  }
  const group = state.mainGroup
  return {
    key: 'main',
    kind: 'main',
    targetId: group.targetId,
    roomId: null,
    name: group.name || mainGroupName,
    color: MAIN_GROUP_COLOR,
    playback: group.playback,
    volume: group.volume
  }
}
