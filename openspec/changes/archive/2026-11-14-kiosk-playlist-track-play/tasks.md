## 1. Audio service and state

- [x] 1.1 `AudioPlayback`: remove `playlistId`, add `sourceUri: string | null` and `shuffle: boolean`; update `normalizePlayback` and `idlePlayback` (design D1)
- [x] 1.2 `playMedia(targetId, uri, shuffle?, startIndex?)`: send `startIndex` only when given; existing callers unchanged
- [x] 1.3 Add route `audioAlbumTracks: '/audio/albums/{albumId}/tracks'` in `src/store/rest.ts` and `audioService.getAlbumTracks(id)` → `AudioTrack[]` (same normalization as playlist tracks)
- [x] 1.4 Keep `id` (`string | number | null`) on `AudioSearchItem` in `normalizeSearchItem`
- [x] 1.5 Update the contract comment at the top of `audioService.ts` (startIndex, sourceUri/shuffle, album tracks; drop the "not yet built" note for what is live)

## 2. Playing-row rule

- [x] 2.1 Add `src/utils/audioPlaying.ts` with `playingRow(playback, playlistUri, tracks)` per design D2
- [x] 2.2 Check it against the cases in the spec (in order, shuffled/shifted index, other source, null source, no match) with a small throwaway node script

## 3. Queue popup

- [x] 3.1 `AudioQueueDialog`: `isCurrentPlaylist` by `sourceUri === playlist.uri`; `queueSignature` uses `sourceUri` instead of `playlistId` (design D6)

## 4. Open playlist: per-track play/stop, marking, seek

- [x] 4.1 `AudioPlaylistTracks`: remove the action bar's play button and the `canPlay` prop; keep the shuffle toggle
- [x] 4.2 Add a `playTarget` prop; compute the marked row with `playingRow`; mark it (same look as the search's current row)
- [x] 4.3 Add a play/stop button per row (editable and read-only), disabled without target, not disabled while busy; emit `play-row(index)`
- [x] 4.4 On the marked row with a duration, show `AudioSeekSlider` on a second line, with `@click.stop` and outside the drag handle (design D4)
- [x] 4.5 Move the seek slider styles from `AudioLibrarySearch` to a shared class used by both lists
- [x] 4.6 `AudioPlaylistEditor`: replace `play()` with `playRow(index)` per design D3 (pause/resume on the marked row, else `playMedia` with `startIndex` and the shuffle toggle); pass `playTarget`; remove `can-play`
- [x] 4.7 i18n: row play/stop labels (de/en), remove unused editor play strings if nothing else uses them

## 5. Open album in the search

- [x] 5.1 `AudioLibrarySearch`: open button on album rows with an `id` (`@click.stop`), row tap still adds the album
- [x] 5.2 Album mode: chip with the album name, tracks from `getAlbumTracks` with the sequence guard, loading and failed/retry; only the track section; leaving returns to the query or artist results; typing leaves the album (design D5)
- [x] 5.3 i18n: open-album label (de/en)

## 6. Verify

- [x] 6.1 `npm run lint` and `npm run build` pass
- [x] 6.2 Headless Puppeteer against `npm run serve`, with `playMedia`/command/seek/playlist-edit requests intercepted (no writes to the live backend): per-row play sends `{uri, startIndex, shuffle}`, stop/resume on the marked row, marking with a mocked `audio-state` (in order, shuffled, other source), seek slider on the marked row, no play button in the action bar
- [x] 6.3 Puppeteer: open an album from a live search (read-only), add a track (intercepted), close the chip returns to the results, album without `id` has no open button
- [x] 6.4 Puppeteer: queue popup marks the playlist matching a mocked `sourceUri`
- [x] 6.5 Check at 390, 800 and 1280 px: no horizontal scroll, row buttons ≥ 44 px, search preview slider unchanged after the style move
