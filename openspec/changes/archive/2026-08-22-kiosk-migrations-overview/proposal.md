## Why

The backend runs opportunistic fleet-wide "migrations" (field-reconciliation targets — e.g. the DNS-nameserver fix rolling every Shelly from `10.10.196.4` to `10.10.196.3`, see `FieldReconciliationCoordinator` in `java-overmind-server`), but there is no visibility into their progress anywhere in the GUI. Today the only way to check status is SSHing into the backend and reading logs or the DB directly. An operator standing at a kiosk tablet has no way to see whether a migration is still running, which nodes it still needs to reach, or which nodes have gotten stuck in error — so stuck migrations go unnoticed indefinitely.

## What Changes

- Add a new kiosk-reachable page, "Migrations Overview", listing every backend reconciliation target as its own card/row:
  - Migration name/type (e.g. "DNS nameserver → 10.10.196.3")
  - Affected nodes (which appliances are in scope for this target)
  - Count of nodes completed (reconciled)
  - Count of nodes still pending
  - Count of nodes in error (exhausted retries), with the ability to see which specific nodes are in error
- Add a small, frameless, icon-only button (gear icon) fixed to the bottom-right corner, visible across kiosk mode (all `Kiosk*` views), that navigates to the new Migrations Overview page. It must not interfere with existing kiosk panels — minimal footprint, no visible border/background until hovered/tapped.
- Add a client-side service method for fetching reconciliation status from the backend, following the project's existing `webservices` conventions (see `ai/memory/webservices-layer.md`).

## Capabilities

### New Capabilities
- `kiosk-migrations-overview`: a kiosk-reachable page that lists active backend field-reconciliation ("migration") targets with per-target progress (affected nodes, done/pending/error counts, and the identity of nodes currently in error), plus the small frameless gear-icon button that makes the page reachable from anywhere in kiosk mode.

### Modified Capabilities
<!-- None. Existing kiosk views/components are unaffected; the new button is additive global kiosk chrome and does not change any existing capability's requirements. -->

## Impact

- **New code (implemented)**: `src/views/KioskMigrations.vue`, a new route entry in `src/router/index.ts`, a floating gear-button in `App.vue`'s kiosk-mode template, `src/utils/webservices/migrationsService.ts`, and a `rest.ts` endpoint entry (`migrations: '/reconciliation'`).
- **Backend dependency (blocking, in progress)**: `java-overmind-server` has a companion change, `reconciliation-status-endpoint`, underway (its own OpenSpec proposal/design exist in that repo). As of 2026-08-22, `FieldReconciliationCoordinator.getStatus(...)` is already implemented on that repo's `master`, confirming the response contract (see `design.md`, Decision 4) — but the HTTP endpoint (`GET /reconciliation`) itself is **not yet registered/deployed**. This GUI change is fully wired against the confirmed shape and will show a persistent fetch-error state until that endpoint ships.
- **No breaking changes** to existing views, routes, or the store. The gear button is new, additive global kiosk chrome.
- **No new dependencies** — reuses Vuetify (`v-btn icon`, `settings` icon — this project's iconfont is Material Icons ligatures, not `mdi`), the project's `setInterval` + `Debouncer` polling pattern, and `axiosUtils` directly (not `BaseService`, per Decision 5 — this is a read-only, non-CRUD resource).
