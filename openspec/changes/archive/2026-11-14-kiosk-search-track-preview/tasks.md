## 1. Shared seek slider

- [x] 1.1 Create `src/components/audio/AudioSeekSlider.vue` from the bar's seek logic (ticker, interpolated position, drag, hold after release with `HOLD_MS`, release on a new `elapsedAt`, reset on target change, `skip(seconds)`), sending seeks via `runAudioCommand`
- [x] 1.2 Use it in `KioskAudioBar.vue` with unchanged markup and classes; wire the ±10 buttons to `skip` and remove the now-unused seek state from the bar
- [x] 1.3 Lint and build

## 2. Preview in the search

- [x] 2.1 `AudioPlaylistEditor.vue`: pass `playTarget` to `AudioLibrarySearch` as `play-target`
- [x] 2.2 `AudioLibrarySearch.vue`: `playTarget` prop, `audioCommand` mixin, a current-row check on `playback.track.uri`, a play/stop button per track row (`.stop`, disabled without a target, independent of `busy` and of already-added)
- [x] 2.3 Button actions: `playMedia {uri}` without shuffle for other rows; `pause`/`play` for the current row
- [x] 2.4 Marking style and an `AudioSeekSlider` line in the current row when the target reports a duration; clicks on the slider do not add
- [x] 2.5 New i18n keys (tooltip/aria for preview play and stop) in all locale files
- [x] 2.6 Lint and build

## 3. Verify

- [x] 3.1 Puppeteer against `npm run serve` with writes blocked: the bar's seek slider and ±10 still work (request intercepted), with no visual change
- [x] 3.2 Puppeteer: search results show the buttons; play sends `playMedia {uri}` (intercepted, not executed); a row matching a mocked or live current `track.uri` is marked with stop and a slider; the slider release sends a seek; the buttons never send an add
- [x] 3.3 Phone, tablet and PC widths: the row layout does not overflow

## 4. Housekeeping

- [x] 4.1 `ai/open-proposals.md`: remove the search-preview part from the playlist editor entry
