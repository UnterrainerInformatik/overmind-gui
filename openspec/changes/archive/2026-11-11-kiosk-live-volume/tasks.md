## 1. Live sender helper

- [x] 1.1 Add `src/utils/liveSender.ts` with `createLiveSender(send, intervalMs = 200)` returning `push`, `flush` and `cancel` as in design.md D1 (one request in flight, trailing newest level, no duplicate of the last sent level, `flush` resolves with the final call's success)
- [x] 1.2 Document the helper's contract in a header comment (the project has no unit-test setup; rate limit, serialisation, trailing level and no-duplicate are verified in the browser in 4.2/4.3)

## 2. Audio bar volume control

- [x] 2.1 In `KioskAudioBar.vue` create a sender on drag start bound to the target captured at that moment; `volumeInput` pushes the level while dragging (intermediate errors swallowed, design.md D2)
- [x] 2.2 Merge `volumeEnd`/`volumeChange` into one idempotent release handler that holds the level and flushes it through `runAudioCommand`; a tap without drag sends exactly one request
- [x] 2.3 Change the `'target.volume'` watcher to clear the hold only when the state reports the held level (timeout stays `HOLD_MS`); cancel the sender on target switch and in `beforeDestroy`

## 3. Room sliders in the target popup

- [x] 3.1 In `AudioTargetDialog.vue` add `@start/@input/@end` to each room slider with per-room drag state, so the shown number follows the finger
- [x] 3.2 Use one lazily created sender per room id for live pushes and the final flush (via `runAudioCommand`); cancel all senders on destroy
- [x] 3.3 Replace the `{level, from}` hold with "hold until the state reports `level` or `HOLD_MS` passes" (design.md D3)

## 4. Verify

- [x] 4.1 `npm run lint` and `npm run build` pass
- [x] 4.2 In the browser (claude-in-chrome or headless Puppeteer), drag the bar's volume slider and a room slider slowly and watch the network: several throttled `PUT …/volume` requests during the drag (≥ 200 ms apart, never overlapping), the last one equals the released level, no duplicate on release. Note: the dev server hits production - restore the original volumes afterwards
- [x] 4.3 Check that after release the slider does not jump back on intermediate state echoes, and that a tap without drag sends one request
- [x] 4.4 Check at tablet, mobile and PC widths with touch emulation as well as mouse
