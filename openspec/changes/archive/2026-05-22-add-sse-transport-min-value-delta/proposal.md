## Why

The Overmind server's `sse.transports` package gained a new request-body field `minValueDelta` (see `../../java/java-overmind-server/openspec/changes/add-sse-transport-min-value-delta`). When set to a finite `Double > 0`, the server suppresses an emission for a numeric `(applianceId, path)` whose new value differs from the last *emitted* value by less than the threshold. Booleans, strings, timestamps, and aggregate cardinality changes still flow through unconditionally. The anchor is `lastEmitted`, not last received, so slow drift below the threshold never accumulates into a spurious tick.

The GUI currently ignores the field — it is silently dropped on the wire — so the kiosk power panels, floorplan compact view, and appliance list each receive every sub-watt jitter on `relays[*].power`, every 0.05°C wiggle on `temperatures[0].temperature`, and every 1% bounce on `humidities[0].humidity` and `batteries[0].batteryLevel`. None of those are visible at the display resolution we render. Cards still recompute and Vue still re-renders on each tick. The fix is one field on `TransportSpec`, forwarded into the register body when defined, plus chosen values at each call site.

## What Changes

- Add an optional `minValueDelta?: number` to the library-level `TransportSpec` type in `src/lib/sse-client/types.ts`.
- Forward the field in `SseClient.registerOnServer` when the value is `!== undefined`. When undefined, omit the key entirely (the server treats absent as "no suppression"). No client-side validation — the server is authoritative; negative / `NaN` / `±Infinity` → 400 from the server.
- Apply concrete values at every existing call site, sized to what the consumer renders:
  - Compact list views (mixed numerics — power W, temperature °C, humidity %, battery %): `1.0`.
  - Aggregate sums (`KioskPowerPanel` cell power, cell battery): `1.0` — server applies the threshold to the recomputed scalar; cardinality changes (`sampleCount`/`totalCount`) always emit, so a light dropping offline still updates the panel.
  - Kiosk detail per-appliance power: `1.0`.
  - Plug/HT/Contact/Motion detail dialogs (`paths: ['**']`, no 0–1.0 fractional paths): `1.0`.
  - Dimmer and Bulb detail dialogs (`paths: ['**']` — include `dimmers[0].brightness` and `rgbws[0].{brightness,colorTemperature,red,green,blue,white}` as 0–1.0 fractions on the wire, per `DebouncedBwPicker.vue:75,89`): **not** set. A 1.0 threshold would suppress every brightness/RGB update; slider liveness during interaction takes priority over de-noising in those short-lived dialogs.
- No backend changes (server-side change ships separately). No change to `subscribe()` semantics — the subscribe spec inherits the same shape via the library types. No change to `registerTransport`'s callback contract, the `transport-update` event shape, the path cache, or any other consumer-visible behavior beyond the noise floor itself.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `sse-transport-client`: the "Register a transport" requirement is extended to declare `minValueDelta?: number` as part of the `spec` shape, and a new requirement documents how the client forwards the field to the server (`POST /sse/transports/register` body).

## Impact

- Code:
  - `src/lib/sse-client/types.ts` — add `minValueDelta?: number` to `TransportSpec`.
  - `src/lib/sse-client/sseClient.ts` — in `registerOnServer`, append `minValueDelta` to the register body when `record.spec.minValueDelta !== undefined`.
  - `src/views/Appliances.vue` — `minValueDelta: 1.0` on the compact subscription.
  - `src/components/floorplan/Floorplan.vue` — `minValueDelta: 1.0` on the compact `registerTransport`.
  - `src/components/KioskPowerPanel.vue` — `1.0` on the cell power aggregate, cell battery aggregate, and per-appliance detail subscription.
  - `src/components/floorplan/dialogs/FloorplanPlugDialog.vue`, `FloorplanHTDialog.vue`, `FloorplanContactDialog.vue`, `FloorplanMotionDialog.vue` — `1.0` on each detail subscription.
  - `FloorplanDimmerDialog.vue`, `FloorplanBulbDialog.vue` — intentionally **untouched**; left without a noise floor for interactive slider liveness.
- Data flow: server-side filtering only. The wire format of `transport-update` events is unchanged — the GUI sees the same shape, just with fewer events for paths that drift below the threshold.
- Consumers: the 9 call sites above. No other module imports `TransportSpec` for purposes that depend on its shape, and the new field is optional, so unrelated call sites compile unchanged.
- Dependencies: none.
- Rollback: revert the commit. The server tolerates the field's absence; reverting the GUI alone restores prior behavior with no server coordination.
- Ordering: the server-side change must ship first (it does — DTO and validation are in place on the server). Reversing the order would cause 400s on every register call from a GUI that sent the field to a server that didn't know it; the current order is safe (server accepts the field; GUI starts sending it).
