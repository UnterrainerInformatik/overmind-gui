## 1. Audio state

- [x] 1.1 `audioService.ts`: add `AudioWebPlayer` (`targetId`, `name`, `available`, `playback`, `volume`) and `AudioState.players`; `normalizeState` fills it from `raw.players` (missing or not an array → `[]`, entries without a target id dropped, target id read as `targetId` / `maPlayerId` / `playerId`, name falls back to the id) (design D1)
- [x] 1.2 Export `WEB_PLAYER_COLOR = '#455A64'` next to `MAIN_GROUP_COLOR`; document the guessed `players` contract in the service's header comment
- [x] 1.3 Check other places that build or copy an `AudioState` (e.g. `utils/audioState.ts`, tests, mocks) and add `players` there where the type needs it

## 2. Target selection

- [x] 2.1 `audioTarget.ts`: kind `'player'`, `readStoredTarget` accepts `player:`, new `selectedPlayerOf`, `resolveTarget` tries room → player → main group (design D2)
- [x] 2.2 `KioskAudioBar.vue`: `selectionFellBack` overwrites the stored choice for rooms only, never for a `player:` selection (design D3); target selector icon `devices` for kind `player`
- [x] 2.3 Check that `AudioQueueDialog`, `AudioSeekSlider` and `AudioPlaylistEditor` follow a target change from a player to the main group without extra code (queue reloads for the main group)

## 3. Stream strip

- [x] 3.1 `AudioPlanDialog.vue`: append available web players with a target id to `streams` after the solo rooms, key `player:<targetId>`, kind `player`, colour `WEB_PLAYER_COLOR` (design D5); keep `AudioPlanMap` on rooms only
- [x] 3.2 `AudioStreamCard.vue`: kind icon `devices` for `player`; the narrow-card rule applies to players as to solo rooms
- [x] 3.3 Lint and build

## 4. Verify

- [x] 4.1 Puppeteer against `npm run serve` with writes blocked and the `audioState` answer / `audio-state` event extended with 2 mocked web players: cards appear after the rooms with the `devices` icon and the web player colour, no plan area or chip for them
- [x] 4.2 Puppeteer: selecting a web player card → the bar shows its name, icon and colour; play/pause, volume and seek requests go to its `targetId` (intercepted, not executed)
- [x] 4.3 Puppeteer: remove the selected player from the mocked state → bar and an open queue popup switch to the main group, `localStorage.kioskAudioTarget` still holds `player:<id>`; add it back → the bar controls it again; reload while it is missing → main group, choice kept
- [x] 4.4 Puppeteer: an unmocked live state without `players` → strip and bar behave as before
- [x] 4.5 Phone, tablet and PC widths: the strip with web player cards scrolls on its own, no page overflow

## 5. Housekeeping

- [x] 5.1 `ai/open-proposals.md`: remove the web player entry (done when this change was proposed)
- [x] 5.2 Note for the server session: GUI side reads `AudioState.players[] = {targetId, name, available, playback, volume}` and sends those ids on `/audio/targets/{targetId}/…`
