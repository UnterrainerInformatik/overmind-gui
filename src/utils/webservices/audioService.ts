import { singleton as axiosUtils } from '@/utils/axiosUtils'

/*
 * The house audio routes (openspec changes `kiosk-audio-bar` and
 * `kiosk-light-and-sound`). The contract is
 * java-overmind-server's change `audio-music-assistant-bridge`: its specs
 * `audio-music-assistant-bridge` (state, SSE, target commands),
 * `audio-rooms-and-grouping` (rooms, group toggle, room volume) and
 * `audio-library` (playlists with `uri`, radio) are authoritative.
 *
 *   GET  audioState                -> AudioState (also pushed as SSE `audio-state`)
 *   PUT  audioRoomGrouped    {grouped}
 *   PUT  audioRoomVolume     {level}  0..100
 *   PUT  audioRoomLightLinked {linked}
 *   POST audioTargetCommand           play|pause|next|previous
 *   POST audioTargetSeek     {position} seconds
 *   PUT  audioTargetVolume   {level}  0..100
 *   GET  audioTargetQueue          -> {items: [Track], currentIndex}
 *   POST audioTargetQueuePlay {index}
 *   POST audioTargetPlayMedia {uri}
 *   GET  audioRadio                -> {items: [Station]}, at most 8
 *   GET  audioPlaylists            -> {items: [Playlist]}
 *
 * The playlist editor (openspec change `kiosk-playlist-editor`), all from
 * `audio-library`. Edits answer 204, positions are 0-based, and the server
 * answers 404 unknown, 409 read-only, 502 with a `reason` from MA:
 *
 *   POST   audioPlaylists           {name}           -> Playlist
 *   PATCH  audioPlaylist            {name}
 *   DELETE audioPlaylist
 *   GET    audioPlaylistTracks                       -> {items: [Track]}
 *   POST   audioPlaylistTracks      {uris}           appended; MA silently skips a track already in it
 *   DELETE audioPlaylistTracks      {positions}
 *   POST   audioPlaylistTracksMove  {from, to}
 *   GET    audioSearch ?q=&types=track,album,artist
 *          -> {tracks: [Track], albums: [Item], artists: [Item]}, Item = {name, artist, uri, imageUrl}
 *
 * The search shape is what the built server sends (`AudioSearchJson`, a type
 * not asked for is null). Also read: the singular keys `track`/`album`/`artist`
 * and lists wrapped as `{items}`. Adding an album by its URI is **guessed** to
 * work: the server hands the URIs to MA's `add_playlist_tracks` unchanged.
 *
 * The server specs name the fields but not every spelling, and were written
 * before the server was built, so this is the one seam that reads them
 * tolerantly - **guessed**, where noted:
 * - A room's target is its MA player id. Read as `targetId`, else `maPlayerId`,
 *   else `playerId`.
 * - A room's colour is `color` (any CSS colour). The server's room table has no
 *   such column yet; without it a room gets a fixed colour from ROOM_PALETTE by
 *   its id, so it is stable across reloads and devices.
 * - The pin is `pinned`, else the room table's `pinnedToMainGroup`.
 * - Enums may arrive uppercase (`PLAYING`) and are lowered here.
 * - Lists are `{items: [...]}` or a bare array.
 * - `imageUrl` is a server path (`/audio/image?path=...`) and is made absolute.
 * - A room's place on the lights floor plan (`kiosk-light-and-sound`, design
 *   D5). The server's room has no position yet; the GUI assumes
 *
 *     AudioState.rooms[] += {
 *       buttonX: number | null,   // floor-plan image pixels, same system as iconPos
 *       buttonY: number | null
 *     }
 *     audioRoom += buttonX INT NULL, buttonY INT NULL   // editable through the audiorooms CRUD
 *
 *   and also reads a nested `button: {x, y}`. Anything that is not a finite
 *   number is null, and a room without both is not drawn.
 */

export type AudioPlaybackStatus = 'playing' | 'paused' | 'idle'
export type AudioCommand = 'play' | 'pause' | 'next' | 'previous'

export interface AudioTrack {
  title: string;
  artist: string | null;
  album: string | null;
  uri: string | null;
  imageUrl: string | null;
}

export interface AudioPlayback {
  state: AudioPlaybackStatus;
  track: AudioTrack | null;
  /** seconds, true at `elapsedAt` */
  elapsed: number;
  /** epoch milliseconds */
  elapsedAt: number;
  /** seconds; null for a stream */
  duration: number | null;
  playlistId: string | number | null;
  queueIndex: number | null;
}

export interface AudioMainGroup {
  targetId: string;
  name: string;
  memberRoomIds: Array<string | number>;
  playback: AudioPlayback;
  volume: number | null;
}

export interface AudioRoom {
  id: string | number;
  name: string;
  targetId: string | null;
  available: boolean;
  grouped: boolean;
  pinned: boolean;
  lightLinked: boolean;
  muted: boolean;
  volume: number | null;
  /** only meaningful while the room is solo */
  playback: AudioPlayback | null;
  color: string;
  /** floor-plan image pixels; null when the room has no place on the plan */
  buttonX: number | null;
  buttonY: number | null;
}

export interface AudioState {
  mainGroup: AudioMainGroup;
  rooms: AudioRoom[];
}

export interface AudioQueue {
  items: AudioTrack[];
  currentIndex: number | null;
}

export interface AudioPlaylist {
  id: string | number;
  uri: string | null;
  name: string;
  trackCount: number | null;
  editable: boolean;
  imageUrl: string | null;
}

export interface AudioSearchItem {
  name: string;
  artist: string | null;
  uri: string;
  imageUrl: string | null;
}

export interface AudioSearchResult {
  tracks: AudioTrack[];
  albums: AudioSearchItem[];
  artists: AudioSearchItem[];
}

export type AudioSearchType = 'track' | 'album' | 'artist'

/** At most this many results are shown per group. */
const SEARCH_GROUP_LIMIT = 25

export interface AudioStation {
  name: string;
  uri: string;
  imageUrl: string | null;
}

/**
 * The main group's own colour. Room colours are expected to be saturated, so a
 * white-ish neutral stays apart from them; the bar shows a group icon with it
 * as well, in case a room is ever given something close.
 */
export const MAIN_GROUP_COLOR = '#ECEFF1'

const ROOM_PALETTE = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#FDD835', '#6D4C41']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any

export class AudioService {
  private static instanceField: AudioService

  protected server = 'uinf'

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new AudioService())
    }
    return this.instanceField
  }

  /** The current state, or null when the answer is not an AudioState. */
  public async getState (): Promise<AudioState | null> {
    return this.normalizeState(await axiosUtils.getResponse(this.server, 'audioState'))
  }

  public async setRoomGrouped (roomId: string | number, grouped: boolean): Promise<void> {
    return axiosUtils.putToPath(this.server, 'audioRoomGrouped', { roomId }, () => ({ grouped }))
  }

  public async setRoomLightLinked (roomId: string | number, linked: boolean): Promise<void> {
    return axiosUtils.putToPath(this.server, 'audioRoomLightLinked', { roomId }, () => ({ linked }))
  }

  public async setRoomVolume (roomId: string | number, level: number): Promise<void> {
    return axiosUtils.putToPath(this.server, 'audioRoomVolume', { roomId }, () => ({ level: Math.round(level) }))
  }

  public async command (targetId: string, command: AudioCommand): Promise<void> {
    return axiosUtils.postToPath(this.server, 'audioTargetCommand', { targetId, command }, () => ({}))
  }

  public async seek (targetId: string, position: number): Promise<void> {
    return axiosUtils.postToPath(this.server, 'audioTargetSeek', { targetId }, () => ({ position: Math.round(position) }))
  }

  public async setTargetVolume (targetId: string, level: number): Promise<void> {
    return axiosUtils.putToPath(this.server, 'audioTargetVolume', { targetId }, () => ({ level: Math.round(level) }))
  }

  public async getQueue (targetId: string): Promise<AudioQueue> {
    const response = await axiosUtils.getFromPath(this.server, 'audioTargetQueue', { targetId })
    const index = response && !Array.isArray(response) ? this.numberOrNull(response.currentIndex) : null
    return {
      items: this.listOf(response).map(t => this.normalizeTrack(t)).filter((t): t is AudioTrack => t !== null),
      currentIndex: index
    }
  }

  public async playQueueIndex (targetId: string, index: number): Promise<void> {
    return axiosUtils.postToPath(this.server, 'audioTargetQueuePlay', { targetId }, () => ({ index }))
  }

  /** Replaces the target's queue with a playlist or a radio station. */
  public async playMedia (targetId: string, uri: string): Promise<void> {
    return axiosUtils.postToPath(this.server, 'audioTargetPlayMedia', { targetId }, () => ({ uri }))
  }

  public async getRadio (): Promise<AudioStation[]> {
    const response = await axiosUtils.getResponse(this.server, 'audioRadio')
    return this.listOf(response)
      .filter(s => s && s.uri)
      .slice(0, 8)
      .map(s => ({ name: `${s.name || s.title || s.uri}`, uri: `${s.uri}`, imageUrl: this.absoluteUrl(s.imageUrl) }))
  }

  public async getPlaylists (): Promise<AudioPlaylist[]> {
    const response = await axiosUtils.getResponse(this.server, 'audioPlaylists')
    return this.listOf(response)
      .filter(p => p && p.id != null)
      .map(p => this.normalizePlaylist(p))
  }

  public async getPlaylistTracks (playlistId: string | number): Promise<AudioTrack[]> {
    const response = await axiosUtils.getFromPath(this.server, 'audioPlaylistTracks', { playlistId })
    return this.listOf(response).map(t => this.normalizeTrack(t)).filter((t): t is AudioTrack => t !== null)
  }

  /** The new playlist, or null when the answer carries no id. */
  public async createPlaylist (name: string): Promise<AudioPlaylist | null> {
    const response = await axiosUtils.post(this.server, 'audioPlaylists', () => ({ name: name.trim() }))
    return response && response.id != null ? this.normalizePlaylist(response) : null
  }

  public async renamePlaylist (playlistId: string | number, name: string): Promise<void> {
    return axiosUtils.patchToPath(this.server, 'audioPlaylist', { playlistId }, () => ({ name: name.trim() }))
  }

  public async deletePlaylist (playlistId: string | number): Promise<void> {
    return axiosUtils.deleteFromPath(this.server, 'audioPlaylist', { playlistId })
  }

  /** Appends; the GUI never inserts at a position (design D4 of `kiosk-playlist-editor`). */
  public async addPlaylistTracks (playlistId: string | number, uris: string[]): Promise<void> {
    return axiosUtils.postToPath(this.server, 'audioPlaylistTracks', { playlistId }, () => ({ uris }))
  }

  public async removePlaylistTracks (playlistId: string | number, positions: number[]): Promise<void> {
    return axiosUtils.deleteFromPath(this.server, 'audioPlaylistTracks', { playlistId }, () => ({ positions }))
  }

  public async movePlaylistTrack (playlistId: string | number, from: number, to: number): Promise<void> {
    return axiosUtils.postToPath(this.server, 'audioPlaylistTracksMove', { playlistId }, () => ({ from, to }))
  }

  /** Results without a `uri` are dropped, and each group is cut to 25. */
  public async search (query: string, types: AudioSearchType[]): Promise<AudioSearchResult> {
    const params = `q=${encodeURIComponent(query.trim())}&types=${types.join(',')}`
    const response = await axiosUtils.getResponse(this.server, 'audioSearch', params) || {}
    const group = (plural: string, singular: string): Raw[] =>
      this.listOf(response[plural] != null ? response[plural] : response[singular]).filter(i => i && i.uri)
    return {
      tracks: group('tracks', 'track')
        .map(t => this.normalizeTrack(t))
        .filter((t): t is AudioTrack => t !== null)
        .slice(0, SEARCH_GROUP_LIMIT),
      albums: group('albums', 'album').slice(0, SEARCH_GROUP_LIMIT).map(i => this.normalizeSearchItem(i)),
      artists: group('artists', 'artist').slice(0, SEARCH_GROUP_LIMIT).map(i => this.normalizeSearchItem(i))
    }
  }

  /**
   * The URI `playMedia` takes for a playlist. The server sends `uri` (agreed
   * 2026-10-30, `audio-library` spec); MA's library URI is the cheap fallback
   * for a server that does not yet.
   */
  public playlistUri (playlist: AudioPlaylist): string {
    return playlist.uri || `library://playlist/${playlist.id}`
  }

  /**
   * The state as the GUI reads it, or null when `raw` lacks a `mainGroup`
   * object or a `rooms` array. Shared by the REST answer and the SSE event.
   */
  public normalizeState (raw: Raw): AudioState | null {
    if (!raw || typeof raw !== 'object' || !raw.mainGroup || typeof raw.mainGroup !== 'object' || !Array.isArray(raw.rooms)) {
      return null
    }
    const g = raw.mainGroup
    return {
      mainGroup: {
        targetId: `${g.targetId || g.maPlayerId || g.playerId || ''}`,
        name: `${g.name || ''}`,
        memberRoomIds: Array.isArray(g.memberRoomIds) ? g.memberRoomIds : [],
        playback: this.normalizePlayback(g.playback) || this.idlePlayback(),
        volume: this.numberOrNull(g.volume)
      },
      rooms: raw.rooms.filter((r: Raw) => r && r.id != null).map((r: Raw) => this.normalizeRoom(r))
    }
  }

  private normalizeRoom (r: Raw): AudioRoom {
    const targetId = r.targetId || r.maPlayerId || r.playerId
    const button = r.button && typeof r.button === 'object' ? r.button : {}
    return {
      id: r.id,
      name: `${r.name || r.id}`,
      targetId: targetId ? `${targetId}` : null,
      available: r.available !== false,
      grouped: !!r.grouped,
      pinned: !!(r.pinned || r.pinnedToMainGroup),
      lightLinked: !!r.lightLinked,
      muted: !!r.muted,
      volume: this.numberOrNull(r.volume),
      playback: this.normalizePlayback(r.playback),
      color: typeof r.color === 'string' && r.color.trim() !== '' ? r.color : this.paletteColor(r.id),
      buttonX: this.numberOrNull(r.buttonX != null ? r.buttonX : button.x),
      buttonY: this.numberOrNull(r.buttonY != null ? r.buttonY : button.y)
    }
  }

  private normalizePlayback (p: Raw): AudioPlayback | null {
    if (!p || typeof p !== 'object') {
      return null
    }
    const state = `${p.state || 'idle'}`.toLowerCase()
    return {
      state: state === 'playing' || state === 'paused' ? state : 'idle',
      track: this.normalizeTrack(p.track),
      elapsed: this.numberOrNull(p.elapsed) || 0,
      elapsedAt: this.numberOrNull(p.elapsedAt) || Date.now(),
      duration: this.numberOrNull(p.duration),
      playlistId: p.playlistId != null ? p.playlistId : null,
      queueIndex: this.numberOrNull(p.queueIndex)
    }
  }

  private normalizePlaylist (p: Raw): AudioPlaylist {
    return {
      id: p.id,
      uri: p.uri || null,
      name: `${p.name || p.id}`,
      trackCount: this.numberOrNull(p.trackCount),
      editable: !!p.editable,
      imageUrl: this.absoluteUrl(p.imageUrl)
    }
  }

  private normalizeSearchItem (i: Raw): AudioSearchItem {
    const artist = i.artist || (Array.isArray(i.artists) ? i.artists.join(', ') : null)
    return {
      name: `${i.name || i.title || i.uri}`,
      artist: artist || null,
      uri: `${i.uri}`,
      imageUrl: this.absoluteUrl(i.imageUrl)
    }
  }

  private normalizeTrack (t: Raw): AudioTrack | null {
    if (!t || typeof t !== 'object') {
      return null
    }
    const artist = t.artist || (Array.isArray(t.artists) ? t.artists.join(', ') : null)
    return {
      title: `${t.title || t.name || ''}`,
      artist: artist || null,
      album: t.album || null,
      uri: t.uri || null,
      imageUrl: this.absoluteUrl(t.imageUrl)
    }
  }

  private idlePlayback (): AudioPlayback {
    return { state: 'idle', track: null, elapsed: 0, elapsedAt: Date.now(), duration: null, playlistId: null, queueIndex: null }
  }

  private paletteColor (id: string | number): string {
    let n = typeof id === 'number' ? id : 0
    if (typeof id !== 'number') {
      for (const c of `${id}`) {
        n = (n * 31 + c.charCodeAt(0)) | 0
      }
    }
    const len = ROOM_PALETTE.length
    return ROOM_PALETTE[((n % len) + len) % len]
  }

  private listOf (response: Raw): Raw[] {
    if (Array.isArray(response)) {
      return response
    }
    return response && Array.isArray(response.items) ? response.items : []
  }

  private numberOrNull (value: unknown): number | null {
    return typeof value === 'number' && isFinite(value) ? value : null
  }

  private absoluteUrl (url: string | null | undefined): string | null {
    if (!url) {
      return null
    }
    return /^(ws|http)s?:\/\//.test(url) ? url : `${axiosUtils.baseUrlOf(this.server)}${url}`
  }
}

export const singleton = AudioService.getInstance()
