## Context

See `proposal.md` - Why. Relevant existing conventions (`ai/memory/`):
- `kiosk-mode.md`: kiosk mode is a Vuex boolean (`gui.kioskMode`); `App.vue` conditionally hides the app-bar/drawer with `v-if="!kioskMode"`. There is no existing "global kiosk chrome" element that is always present across all `Kiosk*` views other than the bare `<router-view>`.
- `webservices-layer.md` / `backend-api-contract.md`: REST calls go through `BaseService` + `axiosUtils`, endpoints resolved from `store/rest.ts`'s `endpoint` map; list responses are `{ entries: [...] }`.
- `polling-and-debouncing.md`: the project's standard pattern for keeping a view fresh is `setInterval` in `mounted()`, cleared in `beforeDestroy()`/`destroyed()`.

On the backend (`java-overmind-server`), migrations are `FieldReconciliationCoordinator` targets. Per target, the coordinator persists (via `ReconciliationActionDao`/`ReconciliationActionJpa`) a **pending** map (`applianceId -> attemptCount`) and a **failed** set (`applianceId`). Critically, it does **not** persist a "done" list — once an appliance is reconciled it is simply removed from `pending`. So a "done" count is not directly available from existing backend state; it has to be derived as `totalEligibleNodes - pending.size() - failed.size()`, which requires the backend to also expose how many nodes are eligible/enrolled in total for a target (currently only known implicitly, via which appliances implement that target's capability interface, e.g. `DnsNameserverFieldAccessor`).

No REST endpoint exposing any of this exists today (confirmed against `ai/primer/endpoints.md` in the backend repo). This design assumes a companion backend change adds one; see Risks below.

## Goals / Non-Goals

**Goals:**
- Define where the gear button lives so it appears on every kiosk view without editing each `Kiosk*.vue` file individually.
- Define the new view's route, data-fetch/polling shape, and the assumed backend contract precisely enough that `tasks.md` (frontend) and a companion backend change can be built against the same shape.
- Keep the button and page fully additive - zero changes to existing kiosk view files.

**Non-Goals:**
- Implementing the backend endpoint itself (tracked as a separate, companion backend OpenSpec change in `java-overmind-server`).
- Allowing operators to trigger/cancel/retry a migration from the GUI - this is a read-only status view.
- Historical/completed migrations (targets that have fully converged and are no longer "active") - out of scope unless the backend continues to report them; the page simply renders whatever the backend returns.

## Decisions

**1. Gear button lives in `App.vue`, not in each `Kiosk*` view.**
`App.vue` already gates the app-bar/drawer with `v-if="!kioskMode"`; it is the one common ancestor rendered for every kiosk route. Adding a `v-if="kioskMode"` floating button block there (or a small child component it includes) makes the button appear on all current and future `Kiosk*` views for free, matching the "reachable from anywhere in kiosk mode" requirement without touching per-view files.
*Alternative considered*: adding it inside the shared `KioskPanel.vue` layout primitive - rejected because not every kiosk view composes its layout through `KioskPanel` uniformly, so coverage would be incomplete.

**2. New view follows the existing `Kiosk*` naming/route convention.**
`src/views/KioskMigrations.vue`, route `/app/kioskmigrations`, registered in `src/router/index.ts` next to the other kiosk routes. Per `kiosk-mode.md`'s pattern, it does not need to call `kioskMode(true)` on mount the way primary kiosk dashboards do, since it's reached *from* kiosk mode (kiosk mode is already on) rather than being an entry point into it - it inherits the sticky `kioskMode` state and therefore still renders without the app-bar/drawer.

**3. Polling interval: slower than the 500 ms plan-status poll.**
Migration progress changes on the order of minutes (bounded by device heartbeat cadence and `MAX_ATTEMPTS = 5` retries per the backend spec), not sub-second. A 5-10 s interval (`setInterval` in `mounted()`, cleared in `destroyed()`, matching `polling-and-debouncing.md`) is enough to feel "live" without adding meaningful backend load. Exact value left to implementation/tasks.

**4. Backend response shape — confirmed against `java-overmind-server`'s companion change.**
Updated 2026-08-22: the backend's own `reconciliation-status-endpoint` OpenSpec change
(`java-overmind-server/openspec/changes/reconciliation-status-endpoint/design.md`, Decision 4)
specifies a shape close to, but not identical to, what was originally assumed here. The
coordinator method it's built on (`FieldReconciliationCoordinator.getStatus(...)`) is already
implemented on that repo's `master` as of this update; the HTTP endpoint itself (`GET
/reconciliation`) is **not yet registered/deployed** — backend tasks 2.x/3.x are still open.
Endpoint: `GET /reconciliation` (top-level, not under `/setup/...` — matches the `/usedswitches`
precedent for computed/status endpoints, per that change's Decision 3).
```jsonc
{
  "entries": [
    {
      "fieldAccessorKey": "wifi-dns-nameserver",  // stable target identifier (was assumed as "key")
      "targetValue": "10.10.196.3",
      "totalNodes": 84,                      // eligible/enrolled nodes for this target
      "doneCount": 60,                       // derived: totalNodes - pending - failed
      "pendingCount": 20,
      "errorCount": 4,
      "errorNodes": [
        { "applianceId": 203, "name": "Alex switch" }
      ]
    }
  ],
  "count": 1
}
```
Differences from the original assumption in this doc: no separate `label` field (the backend
explicitly decided formatting a display string is a GUI concern — the GUI derives it from
`fieldAccessorKey` + `targetValue`) and no `targetField` field at all. The envelope still nests
under `entries` (plus an extra, unused `count`), so it mirrors the project's standard
`{ entries: [...] }` list envelope (`backend-api-contract.md`) and is consumed with the existing
`axiosUtils.getList` helper without a special case. `errorNodes` carries resolved names so the
GUI never needs a second round-trip to identify a stuck node.

**5. New service function, not a generic CRUD `BaseService` instance.**
Reconciliation targets are not a `handlerGroupFor`-style CRUD resource (no create/update/delete from the GUI), so this is a small dedicated read-only fetch function (e.g. `migrationsService.getStatus()`) alongside the existing services, rather than instantiating `BaseService` for a resource that only ever supports `GET`.

## Risks / Trade-offs

- **[Backend endpoint not deployed yet]** → Mitigation: the contract is now confirmed (Decision 4, updated 2026-08-22) against the backend's own `reconciliation-status-endpoint` change, and `FieldReconciliationCoordinator.getStatus(...)` already exists on `master` there — only the HTTP registration (their tasks 2.x/3.x) is still open. Frontend is fully wired against the confirmed shape; the page will show a persistent fetch-error state until that endpoint ships. Flag to Gerald that the two changes should land together.
- **[Backend has no "done" count or total-eligible-node count stored]** → Resolved: the companion backend change derives both live in `getStatus(...)` (`totalNodes` via `accessor.supports(...)` over the loaded fleet, `doneCount = totalNodes - pending - failed`) rather than storing them — see that change's Decision 1.
- **[Polling adds fleet-status load]** → Mitigation: modest interval (Decision 3), scoped to the page's own `mounted`/`destroyed` lifecycle - no global/background polling when the page isn't open.
- **[Small bottom-right button risks accidental taps or visual clutter on a wall-mounted touchscreen]** → Mitigation: kept intentionally minimal (icon-only, no border/background at rest, per proposal), placed in a corner away from primary kiosk panel controls.

## Open Questions

- ~~Exact backend endpoint path and field names~~ — resolved 2026-08-22, see Decision 4. Remaining: the backend endpoint itself isn't deployed yet, so end-to-end verification against real data is still pending.
- Should completed ("done") nodes also be individually listable, the way error nodes are, or is a count sufficient? Current spec only requires per-node detail for errors.
- Final polling interval value.
