## 1. Back to "Licht"

- [x] 1.1 Set `linkLights` back to "Licht" / "Lights" in `src/locales/de-AT.json` and `en-US.json`; verify the overview tile reads "Licht" in the harness
- [x] 1.2 Remove `FloorplanAudioRooms` from `KioskLights.vue`, delete `src/components/audio/FloorplanAudioRooms.vue` and its `page.kiosk.audio.map.*` locale keys (keep the generic slot in `Floorplan.vue`); verify the lights plan shows no audio buttons and its lights still switch

## 2. Audio service contract

- [x] 2.1 In `audioService.ts` read `manualMuted`, `lightMuted` and `lights` (also `lightApplianceIds` as array or JSON text, entries `12`/`"12"`/`"12:1"`) with the fallbacks of design D1; drop `buttonX/buttonY`; update the contract comment at the top; verify with `npm run lint` and a unit check of `normalizeState` on old and new room shapes
- [x] 2.2 Add `audioRoomManualMuted` (`/audio/rooms/{roomId}/manualMuted`) to `src/store/rest.ts` and `setRoomManualMuted(roomId, muted)` to the service; verify the request in the harness hits that path with `{muted}`

## 3. Room geometry

- [x] 3.1 Add a geometry helper that turns the appliance list plus a room's light entries into polygons (whole, channel 0/1, groups with and without own coords, first room wins, design D3) and a per-room bounding box, centroid and small-room flag; verify with a small table of cases run in node
- [x] 3.2 Load and cache the appliance list once per page session, refreshed in the background on each open; verify a second open sends the request again without blanking the plan

## 4. Popup shell

- [x] 4.1 Create `AudioPlanDialog.vue` (fullscreen, persistent, close button, back action closes it, tool bar with five tools, `tool` reset to Overview on open) with the same props and `select` event as the old dialog; wire it into `KioskAudioBar.vue` and delete `AudioTargetDialog.vue`; verify opening, closing, back action and that a click on the error snackbar does not close it
- [x] 4.2 Lay out tool bar 48 px / plan at full width / stream strip filling the rest (min 150 px, vertical scroll below that) per design D8; verify at 1020 × 590 that nothing scrolls and at 390 px that the page has no horizontal scroll

## 5. Plan map

- [x] 5.1 Create `AudioPlanMap.vue`: plan image plus SVG in image pixels, one group of polygons per room filled in its stream colour, unavailable rooms grey and dimmed; verify in the harness with a mocked state of 15 rooms
- [x] 5.2 Add the `╱` and `╲` hatch patterns (two-tone, stronger in the Mute tool) and draw manual, light and both; verify each case on the main group colour and every palette colour by screenshot
- [x] 5.3 Add hit testing with the 44 px halo for small rooms drawn below all polygons (design D4); verify a tap next to a 30 × 25 px room hits it and a tap on a neighbouring room still hits the neighbour
- [x] 5.4 Add chips for rooms without area (bottom right of the plan) and the all-chips fallback when the plan image or appliances fail; verify by failing the appliance request in the harness
- [x] 5.5 Add the per-tool marks of design D9 (names in Overview where they fit, pin in Group, amber outline and bulb in Light); verify by screenshot per tool

## 6. Tools

- [x] 6.1 Overview tap emits the room's stream key; the strip scrolls that card into view and pulses it; verify no request is sent
- [x] 6.2 Mute tool toggles `manualMuted` only, Group tool toggles `grouped` (pinned sends nothing), Light tool toggles `lightLinked`; one in-flight flag per room and tool, errors through `audioCommand`; verify each request body, the double-tap case and a failing request in the harness
- [x] 6.3 Move the live sender plus 3 s hold into a shared helper (design D6) and build the Volume tool: fill level and number per room, drag after 6 px, 2 px per level, clamped, bubble beside the finger, tap sends nothing; verify the "Drag up" scenario (30 → 50 after 40 px) and the live-volume rules (≥ 200 ms apart, released level last, no duplicate)

## 7. Stream cards

- [x] 7.1 Create `AudioStreamCard.vue`: main group first, then every available solo room; colour, cover, title/artist or "nothing playing", previous / play-pause / next, live volume slider to `PUT /audio/targets/{targetId}/volume`; narrow form for a solo room with nothing to play; selected mark; tap outside controls selects and closes; verify each scenario of "One card per stream" in the harness

## 8. Verification

- [x] 8.1 `npm run lint` and the production build (`npm run build`, which type-checks unlike the dev server)
- [x] 8.2 Headless Chrome at 1020 × 590, 1280 × 600 and 390 × 844 against a mocked audio state and appliance list: every scenario of `kiosk-audio-plan-popup`, plus the modified `kiosk-audio-bar` and `kiosk-light-and-sound` scenarios
- [ ] 8.3 Once the server change `audio-desired-state-and-manual-mute` is deployed: against the real server on a quiet room, toggle manual mute, group and light link and drag the volume, and check the state follows; put every room back as it was afterwards
