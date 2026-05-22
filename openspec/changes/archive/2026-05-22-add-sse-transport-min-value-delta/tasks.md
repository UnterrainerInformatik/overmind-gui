## 1. Library — accept and forward `minValueDelta` in `src/lib/sse-client/`

- [x] 1.1 Add `minValueDelta?: number` to the `TransportSpec` interface in `src/lib/sse-client/types.ts`. Place it after `aggregate?` so the field order in the type mirrors the field order in the register body.
- [x] 1.2 In `src/lib/sse-client/sseClient.ts` `registerOnServer`, after the existing `if (record.spec.aggregate) { body.aggregate = ... }` block, add `if (record.spec.minValueDelta !== undefined) { body.minValueDelta = record.spec.minValueDelta }`. Use strict `!== undefined` so a caller passing `0` (server-defined as inert) still travels on the wire — the server is the source of truth for what `0` means, not the client.
- [x] 1.3 No validation on the client. Negative, `NaN`, `±Infinity` → server returns 400 and the existing `registerOnServer` `catch` path surfaces it via `record.initialReject` / `sub.error`. Matches every other field's posture.

## 2. Consumer wiring — apply chosen values

- [x] 2.1 `src/views/Appliances.vue` — `minValueDelta: 1.0` on the compact subscription (line ~96 within the `subscribe({...})` literal).
- [x] 2.2 `src/components/floorplan/Floorplan.vue` — `minValueDelta: 1.0` on the compact `registerTransport({...})` literal (line ~962).
- [x] 2.3 `src/components/KioskPowerPanel.vue` — `minValueDelta: 1.0` on `cell.powerSub` (aggregate sum), `cell.batterySub` (aggregate sum), and `this.detailSub` (non-aggregate per-appliance).
- [x] 2.4 `src/components/floorplan/dialogs/FloorplanPlugDialog.vue` — `minValueDelta: 1.0` on the detail subscription. No fractional 0–1.0 paths in PLUG state.
- [x] 2.5 `src/components/floorplan/dialogs/FloorplanHTDialog.vue` — `minValueDelta: 1.0`. Temperature in °C and humidity / battery in % are all integer-display resolutions.
- [x] 2.6 `src/components/floorplan/dialogs/FloorplanContactDialog.vue` — `minValueDelta: 1.0`. Boolean paths (`closures[0].open`, `closures[0].tilt`) bypass the filter automatically; battery in %.
- [x] 2.7 `src/components/floorplan/dialogs/FloorplanMotionDialog.vue` — `minValueDelta: 1.0`. Boolean motion path bypasses; battery in %.
- [x] 2.8 `src/components/floorplan/dialogs/FloorplanDimmerDialog.vue` — **leave unset**. Selection uses `paths: ['**']`, which includes `dimmers[0].brightness` as a 0–1.0 fraction; a 1.0 threshold would suppress every brightness update. Liveness during interaction takes priority over de-noising in a short-lived dialog.
- [x] 2.9 `src/components/floorplan/dialogs/FloorplanBulbDialog.vue` — **leave unset** for the same reason as §2.8 (`rgbws[0].{brightness,colorTemperature,red,green,blue,white}` are 0–1.0 fractions per `DebouncedBwPicker.vue:75,89`).

## 3. Manual verification (dev server)

- [x] 3.1 Run `npm run serve`. Open DevTools Network tab, filter to `POST /sse/transports/register`.
- [x] 3.2 On the Appliances list view, confirm the register body now contains `"minValueDelta": 1`. Confirm response is `200`.
- [x] 3.3 On the floorplan compact view, confirm the same on `Floorplan.vue`'s register call.
- [x] 3.4 On Kiosk overview, confirm `cell.powerSub` and `cell.batterySub` register bodies include `"minValueDelta": 1` and the `"aggregate": { "op": "sum" }` block.
- [x] 3.5 Open each of Plug / HT / Contact / Motion detail dialogs; confirm `"minValueDelta": 1` in their register bodies.
- [x] 3.6 Open Dimmer and Bulb detail dialogs; confirm `minValueDelta` is **absent** from their register bodies (no field in the JSON).
- [x] 3.7 With a kiosk power panel open and a light fluctuating sub-watt, observe in DevTools EventSource frames that `transport-update` events for that cell drop in frequency relative to the pre-change baseline. Confirm the displayed W value remains stable rather than jittering on every reading.
- [x] 3.8 Trigger a cardinality change in an aggregate selection (e.g. a light goes offline). Confirm the panel re-renders (the server always emits on `sampleCount`/`totalCount` changes), even if the absolute W value moved less than 1W.
- [x] 3.9 Open a Dimmer dialog and drag the brightness slider through small movements. Confirm the displayed value updates smoothly — no missed sub-percent steps from a stray noise floor.

## 4. Lint and build

- [x] 4.1 Run `npx eslint` on every edited file. No new warnings.
- [x] 4.2 Run `npm run build` under Node 14. Clean compilation.

## 5. Spec validation

- [x] 5.1 Run `npx openspec validate add-sse-transport-min-value-delta` (under Node 22 per project memory) and confirm clean.
