## 1. Service and route

- [x] 1.1 `src/store/rest.ts`: add `audioTargetShuffle: '/audio/targets/{targetId}/shuffle'`
- [x] 1.2 `audioService`: add `setShuffle(targetId, enabled)` (`PUT {enabled}`, design D1); drop the `shuffle` parameter from `playMedia` (design D5) and fix every caller
- [x] 1.3 `audioService` contract header: document the new route (guessed until the server is built) and that the GUI no longer sends `shuffle` with `playMedia`

## 2. Shuffle toggle component

- [x] 2.1 Add `src/components/audio/AudioShuffleToggle.vue` per design D2 (shows the target's `playback.shuffle`, sends at once, 3 s hold cleared by matching state / timer / failure / target change, `disabled` prop, aria and tooltip conventions)
- [x] 2.2 i18n: move `shuffleOn`/`shuffleOff` from `page.kiosk.audio.editor` to `page.kiosk.audio` in de-AT and en-US (design D6)

## 3. Player bar

- [x] 3.1 `KioskAudioBar`: place `AudioShuffleToggle` between next and the seek slider, `v-if="!narrow"`, disabled when `!available` (design D3)
- [x] 3.2 Check bar styling at 600 and 800 px (fits, no horizontal scroll, same button size as its neighbours)

## 4. Queue popup

- [x] 4.1 `AudioQueueDialog`: add the queue column head with the queue overline and `AudioShuffleToggle`, sticky in the wide layout, shown also for an empty or failed queue
- [x] 4.2 Remove `audio-queue-shuffle`, `toggleShuffle` and the `audioShuffle` store from the playlists head; `playPlaylist` calls `playMedia(targetId, uri)`
- [x] 4.3 Add `shuffle` to `queueSignature` (design D4)

## 5. Playlist page

- [x] 5.1 `AudioPlaylistTracks`: remove the shuffle button and the `shuffle` prop/event; render the action bar only for editable playlists
- [x] 5.2 `AudioPlaylistEditor`: remove `shuffleStore`, `shuffle`, `setShuffle`; `playRow` calls `playMedia(targetId, uri, index)`; update the component doc comment
- [x] 5.3 Delete `src/utils/audioShuffle.ts`; grep that nothing imports it or uses `kioskAudioShuffle` any more

## 6. Verify

- [x] 6.1 `npm run lint` and `npm run build` pass
- [x] 6.2 Headless Puppeteer against `npm run serve`, with `shuffle`, `playMedia` and command requests intercepted (no writes to the live backend) and a mocked `audio-state`: bar toggle reflects `shuffle: true/false`, tap sends `PUT .../shuffle {enabled}` and shows the hold; hold ends on matching state, after ~3 s without, and at once on a mocked 404
- [x] 6.3 Puppeteer: queue popup shows the toggle at the top of the queue (also with an empty queue), none at the playlists; tapping a playlist sends `playMedia {uri}` without `shuffle`; a mocked `shuffle` change reloads the queue
- [x] 6.4 Puppeteer: playlist page has no shuffle toggle; read-only playlist shows no action bar; per-row play sends `{uri, startIndex}` without `shuffle`
- [x] 6.5 Check at 390, 800 and 1280 px: bar without toggle at 390 and with it at 800/1280, no horizontal scroll, popup toggle visible while the queue scrolls at 1280

## 7. Server handoff

- [x] 7.1 Hand the route contract (design D1) and the open MA question (does `player_queues/shuffle` reorder the running queue?) to the java-overmind-server session
