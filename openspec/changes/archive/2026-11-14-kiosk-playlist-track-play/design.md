## Context

See proposal.md for the motivation. Current state:

- `AudioPlaylistTracks` renders the open playlist with an action bar (play, shuffle, add, rename,
  delete). `AudioPlaylistEditor.play()` sends `playMedia(target, playlistUri, shuffle)` to
  `playTarget`, which is the audio bar's target or the stored target resolved against the shared
  audio state.
- `AudioLibrarySearch` already previews search tracks on `playTarget` (change
  `kiosk-search-track-preview`). A track is marked by `playback.track.uri`, play/stop works as
  pause/resume on the marked track, and a shared `AudioSeekSlider` sits on the marked row. The
  artist drill-in replaces the results with a track search and shows a closable chip.
- `audioService.normalizePlayback` still maps `playlistId`. `AudioQueueDialog` uses it in
  `isCurrentPlaylist` and `queueSignature`. The server hard-coded it to null and has now removed
  it, so the queue popup has never marked a playlist.
- Server contract (live, `audio-playlist-start-at-track`): `sourceUri` is
  `library://playlist/<id>` only while the queue pairs one-to-one with the playlist. It is null
  for about 500 ms after a start or a queue change. `queueIndex` equals the row only when the
  queue is unshuffled and no unavailable track comes before that row. `playMedia` takes
  `startIndex` (0-based, playlists only). Album tracks come from `GET /audio/albums/{id}/tracks`.

## Goals / Non-Goals

**Goals:**
- Per-row play/stop, a marked playing row and a seek slider in the open playlist.
- Opening an album in the search.
- Replace `playlistId` with `sourceUri`/`shuffle` everywhere in the GUI.

**Non-Goals:**
- The GUI does not drive "next track"; MA's queue plays on by itself.
- No marking of the playing track in the queue popup beyond what exists (it already highlights
  by queue index).
- No "open album" for albums outside the editor's search (radio dialog, audio page).
- No handling of playlists with duplicate tracks beyond "first match": the server cannot hold a
  track twice in a playlist.

## Decisions

### D1 Playback model: `sourceUri` and `shuffle` replace `playlistId`

`AudioPlayback` loses `playlistId` and gains `sourceUri: string | null` (a non-empty string, else
null) and `shuffle: boolean` (`=== true`, else false). `idlePlayback` sets them to null and
false. Every reader of `playlistId` moves over. Keeping `playlistId` as a derived field was
considered and rejected: it would be a second name for the same fact, and the server no longer
sends it.

### D2 One rule to find the playing row

A small pure helper, `playingRow(playback, playlistUri, tracks)` in `src/utils/audioPlaying.ts`,
returns the row index or null:

1. null when there is no playback, no `track.uri`, no `playlistUri`, or
   `playback.sourceUri !== playlistUri`;
2. `queueIndex`, when it is a valid row and that row's URI equals `track.uri`;
3. otherwise the first row whose URI equals `track.uri`;
4. otherwise null.

This makes the `shuffle` flag unnecessary for the marking. A shuffled or shifted `queueIndex`
fails the URI check in step 2 and falls back to the URI match, which is the server's own advice.
The marking is on whether the target plays or is paused, as in the search preview. A pure
helper can be unit-checked and keeps the component simple. Considered instead: comparing
`queueIndex` only when `!shuffle`. That was rejected because unavailable tracks shift the index
without shuffle as well.

### D3 Row play/stop button, same behaviour as the search preview

The row button is the same as the search preview's:

- On the marked row while the target plays, it shows stop and sends `command(pause)`. On the
  marked row while the target is paused or idle, it shows play and sends `command(play)`. The
  server has no stop command.
- On any other row, it sends `playMedia(targetId, playlistUri, shuffle, startIndex = row)`.

`audioService.playMedia` gets an optional `startIndex` and sends it only when given. Radio and
the search preview stay `{uri}`, and the queue popup stays `{uri, shuffle}`. The editor owns the
command (it already has `playTarget`, `shuffle` and `runAudioCommand`). The tracks component
emits `play-row(index)`/`toggle-row(index)` and gets `playTarget` for the marking and the
slider. The buttons are disabled only when there is no target. They are not disabled while an
edit is busy, because playing does not edit the playlist. They are also shown for read-only
playlists. While a row is dragged, the row indexes are local, but a drag and a tap cannot happen
at the same time.

The action bar's play button and the editor's `play()` are removed. `canPlay` goes away with
them. The shuffle toggle stays in the action bar and applies to every row play.

### D4 Seek slider on the marked row

The marked row wraps onto a second line holding `AudioSeekSlider` bound to `playTarget`, as in
the search (`flex-wrap`, a 100 % basis line, `@click.stop`). It is shown only while
`playback.duration` is set. The slider styles in `AudioLibrarySearch` are moved to a shared
class, so both lists look the same.

### D5 Opening an album in the search

The search normalization keeps `id` (`string | number | null`) on search items. An album row
with an `id` gets an open button (`chevron_right`, `@click.stop`). Tapping the rest of the row
still adds the whole album. Opening an album works like the artist drill-in:

- it shows a closable chip with the album's name;
- the results are replaced by the album's tracks from `audioService.getAlbumTracks(id)`, using
  the same sequence guard, loading bar and failed/retry state;
- only the track section is shown, in album order.

These tracks are normal track results: preview, "already added" and add all work as usual.
Closing the chip returns to the results of the current query (or of the artist), by running
that search again. Typing in the field leaves the album, as it leaves the artist. The open album
remembers the artist it was opened from, so closing it inside an artist drill-in returns to the
artist's tracks. An inline expansion under the album row was considered. It was rejected because
it doubles the result list's layout code, and on a phone a long album would push the other
results far away.

### D6 Queue popup

`isCurrentPlaylist(playlist)` becomes `!!p && !!p.sourceUri && p.sourceUri === playlist.uri`.
`queueSignature` uses `sourceUri` instead of `playlistId`, so the queue reloads when the
target's source changes (including the null → URI step 500 ms after a start).

## Risks / Trade-offs

- [The marking disappears for about 500 ms after a start or a queue change, while `sourceUri` is
  null] → This is accepted. The next `audio-state` event restores it, and nothing is marked
  wrongly in that time.
- [The tracks component's row indexes and the server's playlist differ after an edit made
  elsewhere that has not been reloaded yet] → The editor already reloads on
  `audio-playlist-changed`. A stale `startIndex` gives at worst the wrong track or a 400, which is
  shown as a snackbar with the server's reason.
- [Verification writes to the live backend: a play changes a real room's queue] → Verify with
  Puppeteer and intercepted `playMedia`/command/seek routes. Album tracks and state are
  read-only and can hit the live server.
- [The shared slider styles move out of `AudioLibrarySearch`] → Check the search preview again at
  390/800/1280 px after the move.
