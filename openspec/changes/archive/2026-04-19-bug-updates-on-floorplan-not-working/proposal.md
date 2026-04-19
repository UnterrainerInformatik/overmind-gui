## Why

On the Floorplan view, the initial render of appliance state (on/off icon, power reading) is correct, but live updates from SSE transports fail to reach the UI for plain (non-group) appliances. After the user toggles a light, the backend receives the command and physical relays switch as expected, but the Floorplan UI does not reflect the new state or the new power value — with the single exception that the **first** appliance clicked in a session flips its on/off icon (its power reading still stays at `0`). Every subsequent click is a silent UI dead-end, so the operator has no feedback that their action landed.

This regressed recently — initial state is correct because it is applied once during the REST load path, so the breakage is isolated to the live-update path that applies `transport-update` payloads into the per-appliance reactive state consumed by Floorplan. We need to fix it now because the Floorplan is the primary control surface on tablet, mobile, and PC in Kiosk mode, and this bug leaves operators blind after every click.

## What Changes

- Fix the Floorplan's `transport-update` handler so that `(applianceId, path, value)` triples for plain (non-group) appliances reliably update the reactive state that backs the on/off icon and the power reading for **every** click, not just the first one.
- Ensure the update path uses Vue 2 reactive writes (`Vue.set` for each hop on dynamic paths) so that creating a new `relays[i]` slot or a new scalar property on first update does not silently drop reactivity.
- Keep the existing group-routing branch (child→group mirroring + power aggregation) untouched; the fix is scoped to the non-group branch.
- Add spec coverage describing how the Floorplan binds live `transport-update` payloads into per-appliance reactive state, with explicit scenarios for plain appliances on both `relays[*].state` and `relays[*].power` paths, and for repeated toggles of the same appliance within a session.

## Capabilities

### New Capabilities
- `floorplan-live-updates`: How the Floorplan view subscribes to SSE transports and applies `transport-update` payloads into the per-appliance reactive state that drives on/off icons and power readings, covering plain appliances, group children (power aggregation + state mirroring), and repeated-click behavior.

### Modified Capabilities
<!-- None. The `sse-transport-client` capability's contract (deliver triples to the registered callback) is believed correct; this change is scoped to the consumer-side application of those triples on the Floorplan. If root-cause analysis in design.md shows the client is also at fault, this section will be amended. -->

## Impact

- **Code**: `src/components/floorplan/Floorplan.vue` (the `transport-update` handler and its `writePath` helper); possibly `src/utils/overmindUtils.ts` (`setPathValue`) if the reactive-write bug lives there; possibly `src/utils/sseClient.ts` if root cause turns out to be client-side (e.g., a transport handle being overwritten across repeated clicks).
- **Specs**: Introduces `openspec/specs/floorplan-live-updates/spec.md`.
- **Runtime behavior**: No new network traffic or API surface — the fix restores previously-expected UI behavior. No migration required.
- **Views affected**: Floorplan on all form factors (tablet, mobile, PC) including Kiosk mode.
- **Dependencies**: No changes to external dependencies; Vue 2 reactivity semantics are already in play.
