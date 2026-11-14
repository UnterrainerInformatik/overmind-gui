import { AudioPlayback, AudioTrack } from '@/utils/webservices/audioService'

/**
 * The row of `tracks` (an open playlist) the target is on, playing or paused,
 * or null (openspec change `kiosk-playlist-track-play`, design D2):
 *
 * 1. null unless the target's `sourceUri` is this playlist's URI and it has a
 *    track URI;
 * 2. `queueIndex`, when that row's URI is the playing track's;
 * 3. otherwise the first row with the playing track's URI (a shuffled queue,
 *    or one shifted by unavailable tracks);
 * 4. otherwise null.
 */
export function playingRow (
  playback: AudioPlayback | null | undefined,
  playlistUri: string | null | undefined,
  tracks: Array<Pick<AudioTrack, 'uri'>>
): number | null {
  const uri = playback && playback.track ? playback.track.uri : null
  if (!playback || !uri || !playlistUri || playback.sourceUri !== playlistUri) {
    return null
  }
  const index = playback.queueIndex
  if (index !== null && Number.isInteger(index) && index >= 0 && index < tracks.length && tracks[index].uri === uri) {
    return index
  }
  const found = tracks.findIndex(t => t.uri === uri)
  return found >= 0 ? found : null
}
