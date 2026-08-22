## 1. Backend contract alignment

- [x] 1.1 Confirm the assumed response shape from `design.md` (Decision 4) against the companion backend endpoint in `java-overmind-server` (or adjust it if the backend change lands with a different shape) before wiring the real service call. Confirmed 2026-08-22 against `java-overmind-server/openspec/changes/reconciliation-status-endpoint/design.md` + the already-implemented `FieldReconciliationCoordinator.getStatus(...)`: shape differs from the original assumption (`fieldAccessorKey` not `key`, no `label`/`targetField`) — view/design.md updated accordingly. **The HTTP endpoint itself is not deployed yet** (backend tasks 2.x/3.x still open) — real end-to-end verification remains pending.
- [x] 1.2 Add the new endpoint path to `rest.ts`'s `endpoint` map once confirmed. `migrations: '/reconciliation'` — path and shape confirmed per 1.1 (top-level, not `/setup/...`, per the backend design's Decision 3).

## 2. Routing & view scaffold

- [x] 2.1 Add `src/views/KioskMigrations.vue` (empty scaffold, following the `Kiosk*` view conventions in `ai/memory/views-and-components.md`). Implemented as a full view (not just an empty scaffold) — see section 5.
- [x] 2.2 Register route `/app/kioskmigrations` in `src/router/index.ts` next to the other kiosk routes.

## 3. Gear button (global kiosk chrome)

- [x] 3.1 Add a small, icon-only, frameless button (Vuetify `v-btn icon`, `settings` icon — this project's iconfont is `md`/Material Icons ligatures, not `mdi`, so `mdi-cog` from the design doc doesn't apply) fixed to the bottom-right corner, gated by `v-if="kioskMode"`, in `App.vue`.
- [x] 3.2 Wire the button to navigate to `/app/kioskmigrations`.
- [x] 3.3 Verify manually that the button appears on multiple different `Kiosk*` views and does not overlap or intercept taps on existing panels. **Requires a running dev server — left for manual verification.**

## 4. Webservices layer

- [x] 4.1 Add a small read-only `migrationsService` (or similarly named module) under `src/utils/webservices/` with a `getStatus()` function, following `BaseService`/`axiosUtils` conventions (`ai/memory/webservices-layer.md`).
- [x] 4.2 Handle and surface fetch failures distinctly from "no active migrations" (empty list).

## 5. Migrations Overview UI

- [x] 5.1 Render one entry per migration: name/type/label, done count, pending count, error count.
- [x] 5.2 Render an explicit empty state when zero active migrations are returned.
- [x] 5.3 For a migration with `errorCount > 0`, let the operator view the specific error nodes (by name) - e.g. expandable list or dialog per migration entry.
- [x] 5.4 Render a visible error state when a status fetch fails, distinct from the empty state.

## 6. Polling

- [x] 6.1 Add `setInterval`-based polling in `mounted()`, cleared in `beforeDestroy()` (matching the actual convention used across existing views, e.g. `Switches.vue`/`KioskPanel.vue` — `ai/memory/polling-and-debouncing.md`'s "destroyed()" wording is imprecise), 5s interval.
- [x] 6.2 Verify the error state clears automatically once a subsequent poll succeeds. **Requires a running dev server — left for manual verification** (the code sets `fetchError = false` on every successful poll, so this should hold by construction).

## 7. Styling & i18n

- [x] 7.1 No dedicated `_index.scss` needed — the view uses existing Vuetify components plus a small scoped style block (matching the `App.vue` convention of scoped styles targeting Vuetify component classes directly).
- [x] 7.2 Add any new user-facing strings to `src/locales/de-AT.json` (and the English default), per `ai/memory/i18n-and-theming.md`.

## 8. Verification

- [x] 8.1 Manually verify in a running dev server: gear button reachable from at least two different kiosk views, page loads, list/empty/error states all render correctly (mock or point at the real backend endpoint once available). **Left for the user** (build/test/deploy is user-owned).
- [x] 8.2 Update `ai/memory/views-and-components.md` (new view/route) and `ai/memory/kiosk-mode.md` if this changes any documented kiosk-mode behavior.
