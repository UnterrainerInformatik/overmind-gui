## Why

`FloorplanDialogFactory.show()` (`src/components/floorplan/dialogs/FloorplanDialogFactory.vue:173-180`) currently only opens the detail dialog when `mapFqn()` finds a hard-coded match for the appliance's `classFqn`. When the FQN isn't in the switch (e.g. `info.unterrainer.server.overmindserver.vendors.solax.SolaxX3G4Appliance` — a Solax inverter passing through the `usageType: 'PLUG'` filter and rendering on KioskPlugs), `show()` silently returns. No dialog opens. No console output. The user clicks the avatar in detail mode and nothing happens, with no diagnostic.

This is a UX trap: every appliance that survives the floorplan's type/FQN filter is a clickable avatar, but the contract for "what happens when I click" depends on a hidden allowlist hidden inside another component. Adding a new vendor or device class without also editing `mapFqn()` produces an avatar that looks identical to a working one but ignores clicks.

## What Changes

- `FloorplanDialogFactory.show()` SHALL open the detail dialog (`dialogOpen = true`) for any appliance whose factory was instantiated, regardless of whether `mapFqn()` finds a matching renderer.
- When `mapFqn()` finds a renderer, behavior is unchanged: the specific component (e.g. `FloorplanPlugDialog`) renders inside the dialog body, and the metadata expansion panels (ID, IP, last online, config JSON, state JSON) start collapsed behind the help-icon toggle.
- When `mapFqn()` finds no renderer, the dialog still opens — the body's renderer slot is empty, and the metadata expansion panels start collapsed exactly the same as the mapped case. The user clicks the help icon to view metadata if they want it. Initial-state behavior is uniform across mapped and unmapped FQNs.
- No change to `mapFqn()` itself. Adding a Solax-specific `<FloorplanInverterDialog>` (or any other vendor-specific renderer) is a separate, additive follow-up that can land later without changing the silent-fail contract.

## Capabilities

### New Capabilities
- `floorplan-detail-dialog`: defines the always-open contract of the Floorplan's per-appliance detail dialog and how it degrades for appliances whose `classFqn` has no specialised renderer registered.

### Modified Capabilities
<!-- None. -->

## Impact

- **Code touched**: `src/components/floorplan/dialogs/FloorplanDialogFactory.vue` only — `show()` method body, plus a tiny adjustment to the initial state of `showAdditionalInfo` so the unmapped-FQN path opens the metadata panel by default.
- **No changes to** `mapFqn()`, `Floorplan.vue`, the SSE transport, the appliance data model, or any per-vendor dialog components.
- **No new dependencies**, no migrations, no backend impact.
- **Behavior change for end users**: clicking an avatar in detail mode now always opens a dialog, so silent no-ops vanish. For appliance 177 (Solax inverter, `SolaxX3G4Appliance`) and any other appliance whose `classFqn` isn't in the switch, the dialog opens with the same initial layout as mapped appliances — metadata panels collapsed behind the help-icon toggle, body's renderer slot empty. Existing mapped appliances (Shelly plugs/relays/dimmers/etc.) are unchanged.
- **Forward compatibility**: future vendors / device classes are diagnosable from the GUI without needing a frontend release. A subsequent PR can add a specialised renderer when one is worth building (e.g. `FloorplanInverterDialog` for Solax) without altering the open-dialog contract.
