## Context

`KioskPowerPanel.vue` renders a grid of energy cells (e.g. grid, solar, battery, kitchen, lights) inside a single `FlipCard`. Each cell has an `@click.stop="frontClicked(i, j)"` handler; clicking any cell flips the whole card to reveal the detail view for the clicked cell (commit 52fcfd8, *"update"*, 2026-04-19 reworked the component around the new SSE transport client — see `openspec/specs/sse-transport-client/spec.md`).

Relevant current behavior:

- `frontClicked(i, j)` gates on `!flipCard.showBack`. Only the first click while the card is on its front sets `showDetailsOf = { i, j }` and fires `openDetailTransport(i, j)` (fire-and-forget async). It then flips the card.
- `openDetailTransport` calls `closeDetailTransport()` (which unregisters `this.detailHandle` if set and clears `this.detailApps = []`), then `await`s `SseClient.registerTransport({...selection.perAppliance from cell.d.appliances}, cb)`, then stores the resolved handle in `this.detailHandle`. The callback closure captures `cell` and calls `this.onDetailUpdate(cell, payload)`.
- `onDetailUpdate(cell, payload)` sums `payload.values` by `applianceId`, then builds `list` by iterating `cell.d.appliances`, filters entries with `|powerRaw| ≤ 1 W`, sorts descending, caps at 12, and assigns `this.detailApps = filtered`.
- `backClicked` flips the card back and calls `closeDetailTransport()`.

The per-cell aggregate transports registered in `mounted()` (for the front-face power bars) are not in scope for this fix; they each have their own handle stored on the cell and are correctly scoped.

## Goals / Non-Goals

**Goals:**

- The detail sub-list, after any sequence of cell clicks (including rapid re-clicks and click→back→click sequences), shows only appliances from the most recently clicked cell's `d.appliances`.
- No orphaned SSE transport remains registered on the server after a detail view is superseded or closed.
- No stale callback from a superseded transport can write into `this.detailApps`.
- Preserve the existing visible behavior: group-only list, sort desc by power, drop entries with `|powerRaw| ≤ 1 W`, cap at 12, show `<power>: <name>` lines.

**Non-Goals:**

- Not changing the `sse-transport-client` API or its payload dispatch contract.
- Not changing the `KioskPowerPanel` prop shape or the `KioskOverview.vue` data passed into it.
- Not redesigning the flip/detail UX (still one detail view at a time, still driven by the most recent click).
- Not touching the per-cell front-face aggregate transports registered in `mounted()`.
- Not covering the mirror `batteryAppliances` list (the detail view intentionally reflects `appliances` only, matching current behavior).

## Decisions

### Decision 1: Root cause is a race across the async `registerTransport` await, not wrong list-building logic

The `onDetailUpdate` function already builds `list` by iterating `cell.d.appliances`, so the rendered list is structurally bounded to the clicked cell — assuming the closure-captured `cell` matches the cell the user is currently viewing and no other callback writes to `detailApps` concurrently. Both assumptions break under the current open/close sequence:

1. `openDetailTransport(A)` starts, calls `closeDetailTransport()` (no-op — `detailHandle` is null), then awaits `registerTransport`.
2. Before A resolves, the user flips back (`closeDetailTransport` again — still no-op) and clicks cell B: `openDetailTransport(B)` starts and awaits.
3. A's promise resolves: `this.detailHandle = handleA`.
4. B's promise resolves: `this.detailHandle = handleB` — **handleA is now orphaned** (no longer tracked, never unregistered).
5. Server-side, handleA keeps emitting `transport-update` events for A's `perAppliance` selection. Its callback closure is still alive (held by the `SseClient` record) and calls `onDetailUpdate(cellA, payload)`, which writes cellA's `detailApps` while the UI is showing B's back-face.

Result: `detailApps` oscillates between A's and B's contents — matching the user's report of "not the appliances of the selected group, maybe all of the appliances" (A's group, shown in B's back view, reads as a wrong/foreign set, and the 25-appliance `lightbulb` group reads as "maybe all of them").

**Alternatives considered:**

- *Server returns values for unrequested appliances*: ruled out — `sse-transport-client` routes by `transportId` and only delivers each transport's own payload; `onDetailUpdate` additionally re-projects through `cell.d.appliances`, so cross-transport leakage alone cannot produce the symptom.
- *`cell.d.appliances` mutated at runtime*: ruled out — `data` is a readonly prop built from a literal in `KioskOverview.vue`.
- *Template binds to the wrong list*: ruled out — template iterates `detailApps`, which is populated only by `onDetailUpdate`.

### Decision 2: Add an epoch / generation token to invalidate superseded detail opens

Introduce a monotonically-increasing `detailEpoch` counter on the component. `closeDetailTransport` and `openDetailTransport` both bump it; the open path captures the epoch at call time and uses it to:

- Gate the callback: `if (capturedEpoch !== this.detailEpoch) return` — stale updates are dropped.
- Gate the handle storage: after `await registerTransport(...)`, if the epoch moved, unregister the just-returned handle immediately and do not assign it to `this.detailHandle`.

This localizes the fix to `KioskPowerPanel.vue` and does not require any change to `sse-transport-client`. It correctly handles: rapid re-clicks, click→back→click, unmount-while-registering (via `beforeDestroy` bumping the epoch too — see Decision 4), and transport-update events that arrive before the register promise resolves (the callback is gated, but `payload` with correct `cell` was always safe; the gating is belt-and-braces).

**Alternatives considered:**

- *Serialize opens behind a mutex/queue*: rejected — more code, harder to reason about, and would force the UI to wait for one register to finish before processing the next click; the epoch approach lets the newer click win immediately.
- *Make `sseClient.registerTransport` return the handle synchronously and resolve the initial-update separately*: rejected — broader API change, touches other consumers (`floorplan-live-updates`, `sse-connection-indicator`), out of scope for a targeted bug fix.
- *Track handles in a `Set<Handle>` and unregister all except the newest*: rejected — same result as the epoch with more bookkeeping; epoch is one integer.

### Decision 3: Clear `detailApps` on open, not only on close

Today `closeDetailTransport` clears `detailApps`. Between `closeDetailTransport` and the first `onDetailUpdate` of the new transport there is a window (register round-trip + first SSE push) in which `detailApps` is already `[]`, which is fine — but if `closeDetailTransport` was not called on some code path (e.g. if we add an early return to `openDetailTransport`), stale entries could briefly show. Explicitly setting `this.detailApps = []` at the top of `openDetailTransport` after the close and epoch bump makes the "empty until first update arrives" invariant unconditional and easy to reason about.

### Decision 4: `beforeDestroy` bumps the epoch too

`beforeDestroy` already unregisters `detailHandle`. Add an epoch bump so any in-flight `registerTransport` whose `await` resolves after unmount cannot write into the (destroyed) component's `detailApps` and cannot leave a server-side orphaned transport if the resolve hits after teardown.

## Risks / Trade-offs

- *Epoch mismatch after `await registerTransport` strands a freshly-registered server transport for one network round-trip*: mitigated — the resolve path unregisters the handle immediately when `epoch !== this.detailEpoch`. At most one orphan transport exists per superseded open, for the few ms between resolve and unregister-call dispatch.

- *Multiple clicks on the same cell while the first register is in flight each bump the epoch and cause the same register→unregister churn*: acceptable — the front-face gate `!flipCard.showBack` already blocks repeated opens from the front while the card is showing back, so this degenerates to at most one superseded open per back→front→click cycle. No user-visible regression.

- *We do not fix a hypothetical server-side bug where a transport returns values for unrequested appliances*: accepted — `onDetailUpdate` already re-projects through `cell.d.appliances`, so such values would be dropped; nothing further required in this change.

- *The fix relies on `detailApps` being the only sink driven by the detail transport callback*: true today; covered by the spec's requirement "the detail callback SHALL write only into `detailApps`" so future edits do not silently regress.

- *Other consumers of `sse-transport-client` (`floorplan-live-updates`, `sse-connection-indicator`) may have similar register-race patterns*: out of scope; their contracts differ (long-lived per-view registrations, not user-triggered open/close cycles), and no user reports point at them. If analogous races surface there, the same epoch pattern applies.
