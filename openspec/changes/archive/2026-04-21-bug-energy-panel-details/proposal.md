## Why

On the kiosk overview main UI (`KioskOverview.vue` → `KioskPowerPanel.vue`), tapping an energy-panel cell flips the card and reveals a detail sub-list that is supposed to show the appliances — with their current power — that belong to the selected group (e.g. "kitchen", "lights", "solar"). In practice the sub-list renders the wrong content: it does not match the clicked group's appliances and appears to leak data from outside the group (possibly all appliances in the system). This makes the detail view useless for its stated purpose (drilling into which appliances of a group are currently drawing power) and is a regression introduced with the recent rewrite of the panel around the new SSE transport client.

## What Changes

- Fix the flip-side detail list of `KioskPowerPanel` so it renders exactly the appliances listed in the clicked cell's `d.appliances` and nothing else.
- Guarantee that the detail SSE transport's `selection.perAppliance` is derived from, and bound to, the clicked cell at registration time (no stale closure over a previously-clicked cell, no cross-cell leakage between rapid clicks).
- Guarantee that `detailApps` is cleared between opens so the previous group's entries cannot be briefly visible on the next flip.
- Preserve existing behavior: sort by power descending, filter out entries with `|powerRaw| ≤ 1 W`, cap at 12 rows, show appliance name (falling back to id) and formatted power.

## Capabilities

### New Capabilities
- `kiosk-energy-panel-details`: the flip-to-details behavior of the kiosk energy panel — what the detail sub-list shows, how it is filtered to the selected group's appliances, how it is sorted/capped, and how it is cleared on close.

### Modified Capabilities
<!-- None. sse-transport-client is consumed but not changed; its contract already supports per-transport filtering. -->

## Impact

- Code: `src/components/KioskPowerPanel.vue` — `frontClicked`, `openDetailTransport`, `closeDetailTransport`, `onDetailUpdate`, and the `<template slot="back">` block that iterates `detailApps`.
- Data flow: no backend changes. The SSE transport already scopes values by registered `selection.perAppliance`; the fix is entirely client-side in how the panel ties the detail transport, the callback closure, and the rendered list to the single selected cell.
- Consumers of `KioskPowerPanel`: `src/views/KioskOverview.vue` (currently the only consumer). No prop or event-shape changes.
- Dependencies: consumes existing `sse-transport-client` capability; no changes to the transport client itself.
- No user-facing API or store changes.
