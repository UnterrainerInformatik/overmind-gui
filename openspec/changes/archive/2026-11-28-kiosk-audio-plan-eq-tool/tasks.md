## 1. Data and service

- [x] 1.1 Add `AudioRoom.eq` (`'bands' | 'crossover' | 'none' | 'unavailable'`, unknown/missing → `'none'`) to `audioService.ts` and update the file's header comment (design D8)
- [x] 1.2 Add routes `audioRoomEq` and `audioRoomEqReset` in `src/store/rest.ts`; add `AudioRoomEq` / `AudioEqBand` / `AudioEqSpeaker` and `getRoomEq`, `setRoomEq`, `resetRoomEq` with tolerant parsing to `audioService.ts` (design D8)
- [x] 1.3 Create `src/utils/audioEq.ts` with `hasEq`, `eqReachable`, `eqFrequencyLabel`, `eqBandKey` (design D3)

## 2. Tool bar and map

- [x] 2.1 Add the `eq` tool (icon `graphic_eq`) after `balance` in `AudioPlanDialog.vue` and its labels to `de-AT.json` / `en-US.json`; narrow tool buttons 40 px (design D1)
- [x] 2.2 Replace `balanceRoomId` / `open-balance` with one `panelRoomId` / `open-panel` in `AudioPlanDialog.vue` and `AudioPlanMap.vue`; `panelRoom` checks `hasBalance` or `hasEq` by active tool; Balance behaviour unchanged (design D2)
- [x] 2.3 In `AudioPlanMap.vue`: EQ tool look (mark for reachable rooms, faded mark for `unavailable`, `--no-eq` dimmed look for others, open room outlined) and tap → `open-panel` only when `hasEq` (design D4)

## 3. EQ panel

- [x] 3.1 Create `AudioEqPanel.vue` shell (head, close, loading / error-with-retry states) reading `getRoomEq` once on open (design D5)
- [x] 3.2 Bands view: one vertical slider per server band with gain and frequency label, horizontally scrollable, panel min-height 220 px (design D5)
- [x] 3.3 Crossover view: *Flat* + frequency toggles, speaker list with role and presets, mismatch mark (design D5)
- [x] 3.4 Write queue: send on release, only changed bands, one in flight, merge pending; crossover through the same queue; answer handling 204/400/404/409/502/503 (design D6)
- [x] 3.5 Two-step reset (*Hauskurve* / *80 Hz*) through the queue, re-read after 204; footer with speaker hosts and the "server overwrites" note (design D5, D6)
- [x] 3.6 SSE: `audio-eq-changed` for this room with own-echo window, `connected` re-read, re-read on `eq` capability switch; never overwrite pending bands (design D7)
- [x] 3.7 Host the panel in `AudioPlanDialog.vue` for the `eq` tool; close on tool switch, popup close, other room tap, and when the room loses `hasEq`
- [x] 3.8 Locale texts (de-AT / en-US) for the panel: roles, reset, confirm, retry, warnings, note

## 4. Verification

- [x] 4.1 `npm run lint` and `npm run build` clean
- [x] 4.2 Headless Puppeteer against `npm run serve` with writes blocked (PUT/POST intercepted, not sent): at 1020 × 590, 768 and 360 px check seven tools fit (apply D1 label fallback if 768 overflows), EQ rooms marked / Cast room dimmed, band panel builds 15 sliders from the live `GET`, a release issues one intercepted `PUT` with only that band, two releases during an in-flight (delayed, intercepted) write merge into one `PUT`, crossover panel shows the speakers and roles and *Flat* sends `{"crossover": null}`, reset asks first, a mocked `503` shows the reason with retry, tool switch closes the panel; also a state without `eq` (every room dimmed); Balance tool still works
- [ ] 4.3 After deploy, one real check with the user's consent: one band on a bands room and back, no playback started
