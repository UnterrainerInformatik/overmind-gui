## 1. Data and service

- [x] 1.1 Add `AudioSpeaker` and `AudioRoom.speakers` / `balanceSupported` to `audioService.ts`, parsed tolerantly (design D4); update the file's header comment
- [x] 1.2 Add route `audioRoomSpeakerVolume: '/audio/rooms/{roomId}/speakers/{playerId}/volume'` in `src/store/rest.ts` and `setSpeakerVolume(roomId, playerId, level)` in `audioService.ts`

## 2. Balance tool and panel

- [x] 2.1 Add the `balance` tool (icon `tune`) to `AudioPlanDialog.vue` and its labels to `de-AT.json` / `en-US.json`
- [x] 2.2 In `AudioPlanMap.vue`: Balance tool look (icon on balance rooms, others dimmed, open room outlined) and tap → `open-balance` for available balance rooms only (design D3a)
- [x] 2.3 Create `AudioBalancePanel.vue`: room name, one slider per speaker with name and level, disabled for unavailable / unknown speakers, close control; live levels via `createHeldLevels` and errors via the `audioCommand` mixin (design D3)
- [x] 2.4 Host the panel in `AudioPlanDialog.vue` over the stream strip; close it on tool switch, popup close, other room tap (switches room) and when the room loses `balanceSupported` (design D2)

## 3. Verification

- [x] 3.1 `npm run lint` and `npm run build` clean
- [x] 3.2 Headless Puppeteer against `npm run serve` with writes blocked: at 1020 × 590, 768 and 360 px check the six tools fit, balance rooms marked / others dimmed, panel opens with the speakers' levels, a drag issues throttled `PUT .../speakers/{playerId}/volume` requests ending with the released level (intercepted, not sent), tool switch closes the panel; also an older state without `speakers`
- [x] 3.3 After deploy, one real check with the user's consent on the stereo-pair room (balance only, no playback)
