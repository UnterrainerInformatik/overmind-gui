## Why

On the kiosk overview, tapping an energy-panel cell flips the `KioskPowerPanel` card and briefly renders the expected detail sub-list of the clicked group's appliances — then, after about one second, every entry except the first one vanishes from the list. The reporter sees a functional initial render followed by a collapse to a single row, making the detail view useless for seeing what else in the group is drawing power. The existing `kiosk-energy-panel-details` capability already guarantees the *correct group* of appliances is shown (fixed on 2026-04-21 by `bug-energy-panel-details`); this is a separate, still-outstanding issue in how the detail list is *maintained* across successive SSE `transport-update` events within a single open.

## What Changes

- Fix `KioskPowerPanel.onDetailUpdate` so an appliance that was rendered on a prior `transport-update` does not disappear merely because the next `transport-update` omits values for it. Subsequent updates must refresh the values they carry and retain previously-seen values for paths they do not carry, rather than treating each update as a complete snapshot.
- Replace the current "re-sum `payload.values` from scratch on every update" logic with a per-open, per-`(applianceId, path)` latest-known-value cache that is initialized empty on each detail open, updated in place from each `transport-update`, and used as the source when computing per-appliance `powerRaw` for the rendered list.
- Clear that cache on `closeDetailTransport` and on component `beforeDestroy`, so it never leaks between opens or survives past unmount.
- Preserve every other behavior already locked in by `kiosk-energy-panel-details`: group-only projection through `cell.d.appliances`, filter `|powerRaw| > 1 W`, descending sort by `powerRaw`, 12-row cap, name fallback to id, epoch-based stale-callback gating, empty-selection skip, close/destroy cleanup.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `kiosk-energy-panel-details`: the existing requirement *"Detail entries display per-appliance summed power and name"* is tightened so that an appliance's `powerRaw` reflects the *latest known value* for each of its selected paths within the current open, not just the values carried by the most recent `transport-update`. A new scenario is added for the delta-update case; the idle-filter and close/destroy scenarios are extended to reference the new per-open cache.

## Impact

- Code: `src/components/KioskPowerPanel.vue` — `data()` (new per-open path-value cache field), `openDetailTransport` (initialize cache), `onDetailUpdate` (update cache + recompute from cache), `closeDetailTransport` (clear cache), `beforeDestroy` (clear cache). The front-face aggregate transports registered in `mounted()` are not in scope — they already use `aggregate: { op: 'sum' }` and do not iterate raw values.
- Data flow: no backend changes. The SSE transport contract is unchanged. We only change how the client interprets a sequence of `values` payloads for a single detail transport (delta-merge vs. snapshot-replace).
- Consumers of `KioskPowerPanel`: `src/views/KioskOverview.vue` (currently the only consumer). No prop or event-shape changes.
- Dependencies: consumes existing `sse-transport-client` capability; no change to the transport client itself.
- No user-facing API or store changes.
