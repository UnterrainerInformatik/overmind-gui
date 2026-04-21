## 1. Component state additions

- [x] 1.1 In `src/components/KioskPowerPanel.vue`, add `detailEpoch: 0` to the component's `data()` fields (next to `detailHandle`, `detailApps`).

## 2. Close / teardown epoch bumps

- [x] 2.1 In `closeDetailTransport()`, increment `this.detailEpoch` before the existing `unregisterTransport` call so that any in-flight open is marked superseded even when `this.detailHandle` is still `null`.
- [x] 2.2 In `beforeDestroy()`, increment `this.detailEpoch` before unregistering `this.detailHandle`, so that a detail `registerTransport` promise that resolves after teardown sees the epoch mismatch and does not write component state.

## 3. Open-detail race fix

- [x] 3.1 In `openDetailTransport(rowIndex, appIndex)`, after calling `this.closeDetailTransport()`, capture the current epoch into a local `const epoch = this.detailEpoch`.
- [x] 3.2 Set `this.detailApps = []` at the top of `openDetailTransport` (immediately after close) so the "empty until first update" invariant holds unconditionally.
- [x] 3.3 Wrap the transport callback so stale updates are dropped: replace `(payload) => this.onDetailUpdate(cell, payload)` with a callback that returns early if `epoch !== this.detailEpoch`, and otherwise delegates to `this.onDetailUpdate(cell, payload)`.
- [x] 3.4 After `await SseClient.getInstance().registerTransport(...)` resolves, if `epoch !== this.detailEpoch`, call `SseClient.getInstance().unregisterTransport(handle)` on the just-returned handle and return without assigning `this.detailHandle`.
- [x] 3.5 Only assign `this.detailHandle = handle` when the post-await epoch check passes (i.e. this open was not superseded).

## 4. Lint and build

- [x] 4.1 Run `npm run lint` and address any warnings/errors introduced by the edits. _(40 pre-existing warnings in `CrudService.ts` / `plansService.ts`; zero from `KioskPowerPanel.vue`.)_
- [x] 4.2 Run `npm run build` to confirm no template/script compilation regressions. _(`npm run build` in the assistant session hit pre-existing environment errors — Node 22 + Webpack 4 OpenSSL 3, and a missing `fibers` native binary in the sass step — neither referencing this file. Compilation verified instead via the user's successful runtime test in §5, which exercises the same Vue template/script compiler path.)_

## 5. Manual verification (dev server)

- [x] 5.1 Run `npm run serve` and open the kiosk overview.
- [x] 5.2 Tap each energy-panel cell in turn (grid, solar, battery, laundry, kitchen, microwave, fireplace, lan, lightbulb). For each, confirm that the back-face detail list names match the clicked group's appliances and that the 12-row cap is respected on the large `lightbulb` group.
- [x] 5.3 Reproduce the race scenario: click cell A, immediately click the back to close, then click cell B, all within ~1 second. Confirm the detail list for B contains only B's appliances and does not briefly or intermittently show A's names.
- [x] 5.4 Repeat 5.3 across three different pairs of cells (small group → large group, large → small, large → large).
- [x] 5.5 With browser devtools open on the Network tab filtered to XHR/fetch, confirm that each detail open produces exactly one `sse/transports/register` call followed by exactly one `sse/transports/deregister` call (modulo in-flight superseded opens, which should still pair register+deregister 1:1).
- [x] 5.6 Close the detail view and leave the page idle for 10 seconds; confirm no further `transport-update` traffic arrives for the closed detail transport (beyond the unavoidable initial in-flight event).
- [x] 5.7 Navigate away from the kiosk overview while a detail view is open; confirm the active detail transport is deregistered (visible as an `sse/transports/deregister` call on page unmount).

## 6. Cross-check against spec

- [x] 6.1 Walk each scenario in `openspec/changes/bug-energy-panel-details/specs/kiosk-energy-panel-details/spec.md` against the implementation and manual test results; confirm every scenario holds.
