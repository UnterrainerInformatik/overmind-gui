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
 *   PUT  audioRoomManualMuted {muted}   see below
 *   PUT  audioRoomSpeakerVolume {level} 0..100, one speaker of a group room
 *   POST audioTargetCommand           play|pause|next|previous
 *   POST audioTargetSeek     {position} seconds
 *   PUT  audioTargetVolume   {level}  0..100
 *   GET  audioTargetQueue          -> {items: [Track], currentIndex}
 *   POST audioTargetQueuePlay {index}
 *   POST audioTargetPlayMedia {uri, startIndex?}
 *   PUT  audioTargetShuffle   {enabled}   see below
 *   GET  audioRadio                -> {items: [Station]}, at most RADIO_STATIONS
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
 *          -> {tracks: [Track], albums: [Item], artists: [Item]}, Item = {id, name, artist, uri, imageUrl}
 *   GET    audioAlbumTracks                          -> {items: [Track]} in album order, 404 unknown
 *
 * Built server extensions (changes `kiosk-playlist-editor-extras`,
 * `audio-queue-follows-playlist-edits` and `audio-playlist-start-at-track`):
 * - `playMedia` takes an optional `shuffle` boolean (server keeps accepting
 *   it), but the GUI no longer sends it (change `audio-shuffle-on-player`):
 *   shuffle is the player's setting, so a start plays in the target's current
 *   shuffle mode.
 * - `playMedia` takes an optional `startIndex` (0-based row, playlists only):
 *   the whole playlist is queued and playback starts at that row; 400 with a
 *   `reason` when the row is out of range or unavailable. The per-track play
 *   buttons of the open playlist send it (change `kiosk-playlist-track-play`).
 * - Playback carries `sourceUri` (`library://playlist/<id>` while the queue
 *   pairs one-to-one with that playlist, null otherwise and for ~500 ms after
 *   a start or queue change) and `shuffle`. `playlistId` is gone. `queueIndex`
 *   equals the playlist row only when unshuffled and no unavailable track
 *   comes before it, so the GUI matches by track URI as a fallback
 *   (`utils/audioPlaying.ts`).
 * - SSE event `audio-playlist-changed` `{playlistId}` (the id as in
 *   `audioPlaylists`) on every change to a playlist, whoever made it: tracks
 *   added, removed or moved, renamed, created, deleted. Coalesced per playlist
 *   (~500 ms). The playlist editor reloads on it; without it nothing reloads.
 * - SSE event `audio-queue-changed` `{targetId}` when the server changed a
 *   target's queue in MA because the playlist it plays was edited (server
 *   change `audio-queue-follows-playlist-edits`; `audio-playlist-changed`
 *   follows it). The queue popup reloads the queue on it for its own target.
 *
 * **Guessed** until java-overmind-server builds it (change
 * `audio-shuffle-on-player`, design D1):
 * - `PUT audioTargetShuffle {enabled: boolean}` switches the target queue's
 *   shuffle mode at once (MA `player_queues/shuffle`, the same queue
 *   resolution as `playMedia`). 204; 404 unknown target; 400 when `enabled`
 *   is missing or not a boolean; 502 with a `reason` when MA fails. The next
 *   `audio-state` carries the new `shuffle`. Until built it answers 404.
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
 * - A room's mute and lights (openspec change `kiosk-audio-plan-popup`,
 *   design D1; built by java-overmind-server change
 *   `audio-desired-state-and-manual-mute`, confirmed against its specs
 *   `audio-manual-mute` and `audio-music-assistant-bridge`):
 *
 *     AudioState.rooms[] += {
 *       manualMuted: boolean,                 // set by hand; the lights never touch it
 *       lightMuted:  boolean,                 // set by the light link only
 *       lights: [{ applianceId: number, channel: number | null }]   // as configured, groups not expanded
 *     }
 *     muted (unchanged) = manualMuted || lightMuted
 *
 *     PUT audioRoomManualMuted {muted}  -> 204, 404 unknown room, 409 speaker unavailable
 *
 *   `lights` is also read as `lightApplianceIds`, an array or the CRUD's JSON
 *   text, with entries `12`, `"12"`, `"12:1"` or `{applianceId, channel}`; a
 *   channel is the 0-based relay index, none means the whole appliance. When
 *   neither `manualMuted` nor `lightMuted` is sent, `manualMuted = muted` and
 *   `lightMuted = false`, so an older server's mute is drawn as manual.
 *   The former guessed `buttonX`/`buttonY` (change `kiosk-light-and-sound`)
 *   were never built and are no longer read.
 * - Web players (openspec change `audio-web-player-targets`, design D1; to be
 *   built in java-overmind-server): MA players no room is configured for -
 *   browser tabs with the MA web UI, the MA mobile app or PWA. **Guessed**:
 *
 *     AudioState.players[] = {
 *       targetId: string,                     // MA player id, also on /audio/targets/{targetId}/...
 *       name: string,                         // MA's name, e.g. "Web (Firefox on Linux)"
 *       available: boolean,
 *       playback: Playback,                   // as a room's
 *       volume: number                        // 0..100
 *     }
 *
 *   The target id is read like a room's. A missing or non-array `players`
 *   gives no web players (today's server), so it does not invalidate the
 *   state; entries without a target id are dropped; the name falls back to
 *   the id. Web players are always solo and never grouped.
 * - A room's speakers and balance (openspec change
 *   `kiosk-audio-plan-balance-tool`; built by java-overmind-server change
 *   `audio-speaker-reconnect-restore-and-balance`, capability
 *   `audio-speaker-balance`):
 *
 *     AudioState.rooms[] += {
 *       speakers: [{ playerId: string, name: string, available: boolean, volume: number }],
 *       balanceSupported: boolean            // a group room with at least two speakers
 *     }
 *
 *     PUT audioRoomSpeakerVolume {level} -> 204, 409 not a group room / speaker
 *                                           unavailable, 404 unknown speaker
 *
 *   Entries without a string `playerId` are dropped, the name falls back to
 *   the id, an unknown volume is null. Missing fields (an older server) give
 *   `speakers: []` and `balanceSupported: false`.
 * - Audiobooks and podcasts (openspec change `kiosk-audiobooks`, design D1;
 *   built by java-overmind-server change `audio-audiobooks-podcasts`, see its
 *   `ai/draft-audio-audiobooks-podcasts-for-frontend.md`). Whole seconds:
 *
 *     GET audioAudiobooks ?library=adults|kids -> {items: [Audiobook]}, 400 unknown library
 *     GET audioAudiobook                       -> Audiobook + {chapters: [{position, name, start, end|null}]}, 404
 *     GET audioPodcasts                        -> {items: [Podcast]}
 *     GET audioPodcastEpisodes                 -> {items: [Episode]} by position, 404
 *     PUT audioPlayed {uri, played}            -> 204 (MA mark_played / mark_unplayed)
 *     POST audioTargetPlayMedia {uri, position?}  position overrides MA's resume point
 *
 *     Audiobook = {id, uri, name, authors: [string], imageUrl|null, duration,
 *                  resumePosition, fullyPlayed, recentRank|null}
 *     Podcast   = {id, uri, name, imageUrl|null, episodeCount, recentRank|null}
 *     Episode   = {id, uri, name, position, duration, resumePosition,
 *                  fullyPlayed, recentRank|null, imageUrl|null}
 *
 *   `recentRank` is MA's play order (agreed 2026-11-15; MA has no playlog
 *   timestamp): 1 = heard most recently, null = never; global per kind, may
 *   have gaps. Episode `id`/`uri` are opaque provider strings
 *   (`filesystem_local--x://podcast_episode/<folder>/<file>`), passed on as
 *   they are. While an item plays, `track.uri` is the book's
 *   `library://audiobook/<id>` or that episode uri, `elapsed` the position in
 *   the whole item and `duration` its total. `seek {position: 0}` on a book
 *   lands at second 1 (MA reads 0 as "resume"). Entries without `uri` are
 *   dropped; a missing number is 0 (`duration` null), `authors` is also read
 *   as a string. The list routes answer 404 on a server without them, which
 *   `isNotAvailable` tells apart from other failures.
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
  /** `library://playlist/<id>` while the queue pairs one-to-one with that playlist, else null */
  sourceUri: string | null;
  shuffle: boolean;
  queueIndex: number | null;
}

export interface AudioMainGroup {
  targetId: string;
  name: string;
  memberRoomIds: Array<string | number>;
  playback: AudioPlayback;
  volume: number | null;
}

/** One light configured for a room; `channel` null means the whole appliance. */
export interface AudioLightRef {
  applianceId: number;
  channel: number | null;
}

export interface AudioRoom {
  id: string | number;
  name: string;
  targetId: string | null;
  available: boolean;
  grouped: boolean;
  pinned: boolean;
  lightLinked: boolean;
  /** `manualMuted || lightMuted` */
  muted: boolean;
  manualMuted: boolean;
  lightMuted: boolean;
  volume: number | null;
  /** only meaningful while the room is solo */
  playback: AudioPlayback | null;
  color: string;
  /** the room's lights as configured, groups not expanded; empty when unknown */
  lights: AudioLightRef[];
  /** the room's MA players; empty when unknown */
  speakers: AudioSpeaker[];
  /** the server can set the speakers' levels one by one */
  balanceSupported: boolean;
}

/** One MA player of a group room, in the server's order. */
export interface AudioSpeaker {
  playerId: string;
  name: string;
  available: boolean;
  /** 0..100, null when unknown */
  volume: number | null;
}

/** A room-less MA player (browser tab, MA app or PWA), always solo. */
export interface AudioWebPlayer {
  targetId: string;
  name: string;
  available: boolean;
  playback: AudioPlayback | null;
  volume: number | null;
}

export interface AudioState {
  mainGroup: AudioMainGroup;
  rooms: AudioRoom[];
  /** empty when the server sends none */
  players: AudioWebPlayer[];
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
  /** the library id (albums: for `getAlbumTracks`); null when the server sends none */
  id: string | number | null;
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

/**
 * Hits asked for per type: the server's maximum. The GUI renders the answer
 * in parts (openspec change `kiosk-search-all-results`, design D1).
 */
const SEARCH_LIMIT = 500

/**
 * At most this many radio stations are shown (mirrors the server's
 * `AudioLibrary.RADIO_STATIONS`). The client keeps its own cap so an older or
 * misconfigured server cannot flood the popup.
 */
export const RADIO_STATIONS = 12

export type AudioAudiobookLibrary = 'adults' | 'kids'

export interface AudioChapter {
  position: number;
  name: string;
  /** seconds */
  start: number;
  /** seconds; null when the server sends none (the book's duration then) */
  end: number | null;
}

export interface AudioAudiobook {
  id: string | number;
  uri: string;
  name: string;
  authors: string[];
  imageUrl: string | null;
  /** seconds; null when unknown */
  duration: number | null;
  /** seconds; 0 when not started */
  resumePosition: number;
  fullyPlayed: boolean;
  /** MA's play order: 1 = heard most recently, null = never */
  recentRank: number | null;
  /** only from `getAudiobook`; empty in lists */
  chapters: AudioChapter[];
}

export interface AudioPodcast {
  id: string | number;
  uri: string;
  name: string;
  imageUrl: string | null;
  episodeCount: number | null;
  recentRank: number | null;
}

export interface AudioEpisode {
  id: string | number;
  uri: string;
  name: string;
  position: number;
  duration: number | null;
  resumePosition: number;
  fullyPlayed: boolean;
  recentRank: number | null;
  imageUrl: string | null;
}

export interface AudioStation {
  name: string;
  uri: string;
  imageUrl: string | null;
}

/**
 * The main group's own colour: a dark indigo, which stays apart from the
 * saturated room colours (including ROOM_PALETTE's lighter blue) and, unlike
 * the former light grey, does not glare on the tablet where the main group is
 * always visible. The bar shows a group icon with it as well, in case a room is
 * ever given something close.
 */
export const MAIN_GROUP_COLOR = '#283593'

/**
 * The one colour all web players share (blue grey 700): a neutral dark slate,
 * apart from MAIN_GROUP_COLOR's indigo, ROOM_PALETTE's saturated hues and the
 * light unavailable grey. Web players are told apart by name.
 */
export const WEB_PLAYER_COLOR = '#455A64'

/**
 * Fallback room colours, picked by room id. 16 entries, so the 13-15 players of
 * the house get one each while their ids are consecutive. Neighbours differ in
 * hue, and none is close to MAIN_GROUP_COLOR, the unavailable grey or the light
 * link's amber.
 */
const ROOM_PALETTE = [
  '#E53935', '#1E88E5', '#43A047', '#FB8C00',
  '#8E24AA', '#00ACC1', '#FDD835', '#6D4C41',
  '#D81B60', '#00897B', '#C0CA33', '#F48FB1',
  '#7E57C2', '#A1887F', '#4FC3F7', '#B71C1C'
]

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

  public async setRoomManualMuted (roomId: string | number, muted: boolean): Promise<void> {
    return axiosUtils.putToPath(this.server, 'audioRoomManualMuted', { roomId }, () => ({ muted }))
  }

  public async setRoomVolume (roomId: string | number, level: number): Promise<void> {
    return axiosUtils.putToPath(this.server, 'audioRoomVolume', { roomId }, () => ({ level: Math.round(level) }))
  }

  public async setSpeakerVolume (roomId: string | number, playerId: string, level: number): Promise<void> {
    return axiosUtils.putToPath(this.server, 'audioRoomSpeakerVolume', { roomId, playerId }, () => ({ level: Math.round(level) }))
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

  /**
   * Replaces the target's queue with a playlist or a radio station.
   * `startIndex` is sent only when given (playlists); no `shuffle` is sent, so
   * the target's current shuffle mode applies (see the contract above).
   */
  public async playMedia (targetId: string, uri: string, startIndex?: number, position?: number): Promise<void> {
    return axiosUtils.postToPath(this.server, 'audioTargetPlayMedia', { targetId }, () => {
      const body: { uri: string; startIndex?: number; position?: number } = { uri }
      if (startIndex !== undefined) {
        body.startIndex = startIndex
      }
      if (position !== undefined) {
        body.position = Math.max(0, Math.round(position))
      }
      return body
    })
  }

  /**
   * Plays an audiobook or podcast episode. Without `position` MA resumes at
   * its stored point; with it playback starts there (design D1).
   */
  public async playItem (targetId: string, uri: string, position?: number): Promise<void> {
    return this.playMedia(targetId, uri, undefined, position)
  }

  public async getAudiobooks (library: AudioAudiobookLibrary): Promise<AudioAudiobook[]> {
    const response = await axiosUtils.getResponse(this.server, 'audioAudiobooks', `library=${library}`)
    return this.listOf(response).filter(b => b && b.uri).map(b => this.normalizeAudiobook(b))
  }

  /** The book with its chapters, sorted by start. */
  public async getAudiobook (audiobookId: string | number): Promise<AudioAudiobook | null> {
    const response = await axiosUtils.getFromPath(this.server, 'audioAudiobook', { audiobookId })
    return response && response.uri ? this.normalizeAudiobook(response) : null
  }

  public async getPodcasts (): Promise<AudioPodcast[]> {
    const response = await axiosUtils.getResponse(this.server, 'audioPodcasts')
    return this.listOf(response).filter(p => p && p.uri).map(p => ({
      id: p.id != null ? p.id : p.uri,
      uri: `${p.uri}`,
      name: `${p.name || p.uri}`,
      imageUrl: this.absoluteUrl(p.imageUrl),
      episodeCount: this.numberOrNull(p.episodeCount),
      recentRank: this.numberOrNull(p.recentRank)
    }))
  }

  /** The episodes sorted by `position`. */
  public async getPodcastEpisodes (podcastId: string | number): Promise<AudioEpisode[]> {
    const response = await axiosUtils.getFromPath(this.server, 'audioPodcastEpisodes', { podcastId })
    return this.listOf(response)
      .filter(e => e && e.uri)
      .map(e => ({
        id: e.id != null ? e.id : e.uri,
        uri: `${e.uri}`,
        name: `${e.name || e.title || e.uri}`,
        position: this.numberOrNull(e.position) || 0,
        duration: this.numberOrNull(e.duration),
        resumePosition: Math.max(0, this.numberOrNull(e.resumePosition) || 0),
        fullyPlayed: e.fullyPlayed === true,
        recentRank: this.numberOrNull(e.recentRank),
        imageUrl: this.absoluteUrl(e.imageUrl)
      }))
      .sort((a, b) => a.position - b.position)
  }

  public async setPlayed (uri: string, played: boolean): Promise<void> {
    return axiosUtils.putToPath(this.server, 'audioPlayed', {}, () => ({ uri, played }))
  }

  /** True for the 404 a route answers before the server has it (design D1, Migration Plan). */
  public isNotAvailable (err: unknown): boolean {
    return !!err && typeof err === 'object' && (err as { status?: unknown }).status === 404
  }

  /** Switches the target queue's shuffle mode at once (guessed route, see above). */
  public async setShuffle (targetId: string, enabled: boolean): Promise<void> {
    return axiosUtils.putToPath(this.server, 'audioTargetShuffle', { targetId }, () => ({ enabled }))
  }

  public async getRadio (): Promise<AudioStation[]> {
    const response = await axiosUtils.getResponse(this.server, 'audioRadio')
    return this.listOf(response)
      .filter(s => s && s.uri)
      .slice(0, RADIO_STATIONS)
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

  public async getAlbumTracks (albumId: string | number): Promise<AudioTrack[]> {
    const response = await axiosUtils.getFromPath(this.server, 'audioAlbumTracks', { albumId })
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

  /**
   * Asks for up to `SEARCH_LIMIT` hits per type; only results without a `uri`
   * are dropped, how much is shown is up to the caller.
   */
  public async search (query: string, types: AudioSearchType[]): Promise<AudioSearchResult> {
    const params = `q=${encodeURIComponent(query.trim())}&types=${types.join(',')}&limit=${SEARCH_LIMIT}`
    const response = await axiosUtils.getResponse(this.server, 'audioSearch', params) || {}
    const group = (plural: string, singular: string): Raw[] =>
      this.listOf(response[plural] != null ? response[plural] : response[singular]).filter(i => i && i.uri)
    return {
      tracks: group('tracks', 'track')
        .map(t => this.normalizeTrack(t))
        .filter((t): t is AudioTrack => t !== null),
      albums: group('albums', 'album').map(i => this.normalizeSearchItem(i)),
      artists: group('artists', 'artist').map(i => this.normalizeSearchItem(i))
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
      rooms: raw.rooms.filter((r: Raw) => r && r.id != null).map((r: Raw) => this.normalizeRoom(r)),
      players: this.normalizePlayers(raw.players)
    }
  }

  private normalizePlayers (raw: Raw): AudioWebPlayer[] {
    if (!Array.isArray(raw)) {
      return []
    }
    const players: AudioWebPlayer[] = []
    for (const p of raw) {
      const targetId = p && typeof p === 'object' ? p.targetId || p.maPlayerId || p.playerId : null
      if (!targetId) {
        continue
      }
      players.push({
        targetId: `${targetId}`,
        name: `${p.name || targetId}`,
        available: p.available !== false,
        playback: this.normalizePlayback(p.playback),
        volume: this.numberOrNull(p.volume)
      })
    }
    return players
  }

  private normalizeRoom (r: Raw): AudioRoom {
    const targetId = r.targetId || r.maPlayerId || r.playerId
    const told = r.manualMuted !== undefined || r.lightMuted !== undefined
    const manualMuted = told ? !!r.manualMuted : !!r.muted
    const lightMuted = told ? !!r.lightMuted : false
    return {
      id: r.id,
      name: `${r.name || r.id}`,
      targetId: targetId ? `${targetId}` : null,
      available: r.available !== false,
      grouped: !!r.grouped,
      pinned: !!(r.pinned || r.pinnedToMainGroup),
      lightLinked: !!r.lightLinked,
      muted: !!r.muted || manualMuted || lightMuted,
      manualMuted,
      lightMuted,
      volume: this.numberOrNull(r.volume),
      playback: this.normalizePlayback(r.playback),
      color: typeof r.color === 'string' && r.color.trim() !== '' ? r.color : this.paletteColor(r.id),
      lights: this.normalizeLights(r.lights != null ? r.lights : r.lightApplianceIds),
      speakers: this.normalizeSpeakers(r.speakers),
      balanceSupported: r.balanceSupported === true
    }
  }

  /** See the contract above. */
  private normalizeSpeakers (raw: Raw): AudioSpeaker[] {
    if (!Array.isArray(raw)) {
      return []
    }
    const speakers: AudioSpeaker[] = []
    for (const s of raw) {
      if (!s || typeof s !== 'object' || typeof s.playerId !== 'string' || s.playerId === '') {
        continue
      }
      speakers.push({
        playerId: s.playerId,
        name: `${s.name || s.playerId}`,
        available: s.available !== false,
        volume: this.numberOrNull(s.volume)
      })
    }
    return speakers
  }

  /** See the contract above; entries that name no appliance are dropped. */
  private normalizeLights (raw: Raw): AudioLightRef[] {
    let list = raw
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list)
      } catch {
        list = list.split(',')
      }
    }
    if (!Array.isArray(list)) {
      return []
    }
    const refs: AudioLightRef[] = []
    list.forEach((e: Raw) => {
      let id: unknown = e
      let channel: unknown = null
      if (e && typeof e === 'object') {
        id = e.applianceId != null ? e.applianceId : e.id
        channel = e.channel != null ? e.channel : null
      } else if (typeof e === 'string' && e.includes(':')) {
        [id, channel] = e.split(':')
      }
      const applianceId = Number(typeof id === 'string' ? id.trim() : id)
      const ch = channel === null || (typeof channel === 'string' && channel.trim() === '') ? null : Number(channel)
      if (id === null || id === '' || !Number.isInteger(applianceId)) {
        return
      }
      refs.push({ applianceId, channel: ch !== null && Number.isInteger(ch) && ch >= 0 ? ch : null })
    })
    return refs
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
      sourceUri: typeof p.sourceUri === 'string' && p.sourceUri !== '' ? p.sourceUri : null,
      shuffle: p.shuffle === true,
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
      id: typeof i.id === 'string' || typeof i.id === 'number' ? i.id : null,
      name: `${i.name || i.title || i.uri}`,
      artist: artist || null,
      uri: `${i.uri}`,
      imageUrl: this.absoluteUrl(i.imageUrl)
    }
  }

  private normalizeAudiobook (b: Raw): AudioAudiobook {
    let authors: string[] = []
    if (Array.isArray(b.authors)) {
      authors = b.authors.filter((a: Raw) => a != null && `${a}`.trim() !== '').map((a: Raw) => `${a}`)
    } else if (typeof b.authors === 'string' && b.authors.trim() !== '') {
      authors = [b.authors]
    } else if (typeof b.author === 'string' && b.author.trim() !== '') {
      authors = [b.author]
    }
    const chapters: AudioChapter[] = Array.isArray(b.chapters)
      ? b.chapters
        .filter((c: Raw) => c && typeof c === 'object' && this.numberOrNull(c.start) !== null)
        .map((c: Raw, index: number) => ({
          position: this.numberOrNull(c.position) !== null ? c.position : index + 1,
          name: `${c.name || c.title || index + 1}`,
          start: Math.max(0, c.start),
          end: this.numberOrNull(c.end)
        }))
        .sort((x: AudioChapter, y: AudioChapter) => x.start - y.start)
      : []
    return {
      id: b.id != null ? b.id : b.uri,
      uri: `${b.uri}`,
      name: `${b.name || b.title || b.uri}`,
      authors,
      imageUrl: this.absoluteUrl(b.imageUrl),
      duration: this.numberOrNull(b.duration),
      resumePosition: Math.max(0, this.numberOrNull(b.resumePosition) || 0),
      fullyPlayed: b.fullyPlayed === true,
      recentRank: this.numberOrNull(b.recentRank),
      chapters
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
    return { state: 'idle', track: null, elapsed: 0, elapsedAt: Date.now(), duration: null, sourceUri: null, shuffle: false, queueIndex: null }
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
