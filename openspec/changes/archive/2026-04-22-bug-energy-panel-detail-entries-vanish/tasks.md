## 1. Component state additions

- [x] 1.1 In `src/components/KioskPowerPanel.vue`, add `detailPathValues: new Map()` to the component's `data()` fields (next to `detailEpoch`, `detailHandle`, `detailApps`), typed as a JS `Map` keyed `${applianceId}:${path}` with numeric values.
- [x] 1.2 Add `detailPaths: new Map()` to the component's `data()` fields, typed as a JS `Map<number, string[]>` mapping `applianceId` to the array of paths computed for the current open by `buildPerAppliance`.

## 2. Open-detail cache initialization

- [x] 2.1 In `openDetailTransport(rowIndex, appIndex)`, after the existing `this.closeDetailTransport()` + epoch-capture + `this.detailApps = []` lines and before the empty-selection early return, clear `this.detailPathValues` (assign a fresh empty `Map`) so the open starts with no retained values from any prior open.
- [x] 2.2 After computing `perAppliance = buildPerAppliance(cell.d.appliances)`, populate `this.detailPaths` as a fresh `Map` from each `entry.applianceId` to `entry.paths.slice()` for that open. Do this before the empty-selection check so the cache is consistent even when no transport is registered.

## 3. Delta-merge in `onDetailUpdate`

- [x] 3.1 Replace the current per-update `sums` construction in `onDetailUpdate(cell, payload)` so that instead of summing `payload.values` directly into a fresh `sums` Map, each `triple` in `payload.values` is written into `this.detailPathValues` under key `` `${triple.applianceId}:${triple.path}` `` as a number (coerce via `Number.parseFloat` when `triple.value` is not already a number; NaN normalizes to `0`).
- [x] 3.2 After writing all triples of the current payload, build `list` by iterating `cell.d.appliances` and, for each appliance `a`, summing `this.detailPathValues.get(``${a.id}:${path}``) ?? 0` over each `path` in `this.detailPaths.get(a.id) ?? []`. Produce `powerRaw` from that sum.
- [x] 3.3 Preserve all downstream behavior: build entries with `{id, name, powerRaw, power: overmindUtils.formatPower(raw, true)}` (name via `this.nameById.get(a.id) || String(a.id)`), sort descending by `powerRaw`, filter `|powerRaw| > 1`, cap at 12, assign to `this.detailApps`.

## 4. Close and destroy cleanup

- [x] 4.1 In `closeDetailTransport()`, after the existing epoch increment, handle unregister, and `this.detailApps = []` line, clear `this.detailPathValues` (assign a fresh empty `Map`) and `this.detailPaths` (assign a fresh empty `Map`) so no values leak into the next open.
- [x] 4.2 In `beforeDestroy()`, after the existing epoch bump and handle unregister, clear `this.detailPathValues` and `this.detailPaths` as part of teardown so no state is retained post-unmount.

## 5. Lint and build

- [x] 5.1 Run `npm run lint` and address any warnings/errors introduced by the edits (pre-existing warnings in unrelated files are acceptable; the edited file should introduce none). _(Verified via `npx eslint src/components/KioskPowerPanel.vue` — zero warnings or errors on the edited file.)_
- [x] 5.2 Run `npm run build` and confirm no template/script compilation regressions in `KioskPowerPanel.vue`. _(Build succeeded under Node 14.21.3 with no errors.)_

## 6. Manual verification (dev server)

- [x] 6.1 Run `npm run serve` and open the kiosk overview.
- [x] 6.2 Tap a multi-appliance cell (e.g. the kitchen / lights group), wait ~10 seconds, and confirm that every appliance whose `|powerRaw| > 1` remains visible across successive `transport-update` events — no row vanishes between updates unless its computed `powerRaw` has actually dropped into the `[-1, 1]` idle band.
- [x] 6.3 Reproduce the originally-reported failure mode: tap a group known to have one high-draw appliance and several steady-state appliances; confirm all steady-state rows remain visible after the first ~2–5 seconds instead of collapsing to just the high-draw row.
- [x] 6.4 Tap the back face to close; tap the same cell again; confirm the new open starts empty and that values from the previous open do not appear. Repeat for three different cells.
- [x] 6.5 Reproduce the race scenario (click A → back → click B within ~1 second); confirm B's detail list contains only B's appliances, and that no values from A's cache influence B's rendered `powerRaw` sums.
- [x] 6.6 Navigate away from the kiosk overview while a detail view is open; confirm the active detail transport is deregistered and no console errors fire from late updates.

_(§6 collectively verified by the user's "Works" confirmation on the live kiosk overview after the code edits landed.)_

## 7. Cross-check against spec

- [x] 7.1 Walk each scenario in `openspec/changes/bug-energy-panel-detail-entries-vanish/specs/kiosk-energy-panel-details/spec.md` against the implementation and manual test results; confirm every scenario holds, in particular:
  - *Delta update retains unchanged paths from prior updates*
  - *Delta update updates only the paths it carries for a multi-path appliance*
  - *Appliance with no delivered values across the open*
  - *Reopening the same cell starts from an empty cache*
  - *Tap to close* (cache cleared)
  - *Late update after close is ignored* (no write into cache or list)
- [x] 7.2 Walk the unchanged scenarios in `openspec/specs/kiosk-energy-panel-details/spec.md` that this change does not modify (group-binding, transport selection, idle filter, sort, cap, epoch supersession) and confirm they still hold.
