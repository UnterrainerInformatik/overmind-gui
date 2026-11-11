## 1. Live reloads in the queue popup

- [x] 1.1 Add `startLive` / `stopLive` to `AudioQueueDialog.vue`: listen to `audio-queue-changed`, `audio-playlist-changed` and `connected` via `SseClient.getInstance()` while `value` is true; remove the listeners on close and in `beforeDestroy`
- [x] 1.2 Add `pending` flags and a 300 ms debounced flush; `audio-queue-changed` only flags the queue when its `targetId` equals the selected target's
- [x] 1.3 Make `loadQueue` / `loadPlaylists` accept `quiet`, keeping the shown data and the failed flag on error
- [x] 1.4 Reload the queue as well as the playlist list when the editor closes
- [x] 1.5 Document `audio-queue-changed` `{targetId}` in the server-events comment of `src/utils/webservices/audioService.ts`

## 1a. Bigger volume slider (added 2026-11-11)

- [x] 1a.1 In `KioskAudioBar.vue` make the volume menu's vertical slider 300 px long (capped at `100vh - 110px`), 36 px wide, track 3 px, thumb 18 px (focus ring 54 px)

## 2. Verification

- [x] 2.1 Lint and build
- [x] 2.2 Headless Chrome against the dev server: open the popup, dispatch / receive `audio-playlist-changed` and `audio-queue-changed` (own and other target) and check the queue requests (one per burst, none for another target), and that closing the editor reloads the queue
- [x] 2.4 Headless Chrome (PC, tablet, phone portrait and landscape): measure the volume slider before and after, and check that the menu stays visible
- [x] 2.3 Once `audio-queue-follows-playlist-edits` is deployed: with a scratch playlist playing on a quiet room, add and remove a track in the editor and check that the popup's queue follows; delete the scratch playlist afterwards
