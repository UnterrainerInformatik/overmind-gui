## Context

Live UI updates flow through a singleton `SseClient` (`src/lib/sse-client/sseClient.ts`, wired in `src/utils/sseClient.ts`). One `EventSource` per session; on error the client marks itself disconnected and schedules a reconnect after a fixed `reconnectDelayMs` (default 3000). `App.vue` polls `SseClient.getInstance().connected` every 2s and paints a red border while disconnected.

When a tab is backgrounded, the OS/browser frequently kills the socket. Recovery today is bounded by: native EventSource retry → possible `CLOSED` → 3s app `reconnectTimer` → connect + re-register → up to 2s poll lag. These stack toward ~10s of red screen. Two edge cases make it worse: `ensureConnection()` returns early when an `EventSource` exists and is not `CLOSED`, so a socket stuck in `CONNECTING` blocks any fresh attempt; and a socket that silently died while hidden may still report `OPEN`, so nothing ever triggers a reconnect. Kiosk views run on tablets/phones (per project constraints), where backgrounding is the norm.

## Goals / Non-Goals

**Goals:**
- Reconnect immediately when the tab/display is re-activated, instead of waiting for the backoff.
- Handle both the stuck-`CONNECTING` case and the silently-dead-but-`OPEN` case.
- Keep the core `SseClient` library free of DOM/framework dependencies.

**Non-Goals:**
- No change to the backoff-based reconnect path itself (still the fallback when the tab stays foregrounded).
- No change to the 2s connection-indicator poll cadence or the red-border styling.
- No server-side changes.

## Decisions

- **New public `reconnectNow()` on the core `SseClient`.** The library stays DOM-agnostic; the DOM wiring (`visibilitychange`/`focus`) lives in `App.vue`, which already owns the connection-indicator lifecycle and is the single SPA root shared by the main page and Floorplan. Alternative considered: attach the listeners inside `src/utils/sseClient.ts` — rejected because lifecycle cleanup is cleaner in the Vue component and it keeps the singleton free of global DOM listeners.
- **Last-activity timestamp, 15s freshness window.** `reconnectNow()` no-ops only when the socket is `OPEN`, connected, and active within 15s; otherwise it forces a reconnect. This catches the deceptive-`OPEN` case without churning a genuinely live connection on quick tab switches. Alternative considered: always tear down on wake — rejected as needless reconnect churn; alternative: only check `readyState`/`connected` — rejected because it misses silent death.
- **Listen on both `visibilitychange` and `focus`.** `visibilitychange` is the standard tab-reactivation signal; `focus` adds robustness on mobile/kiosk browsers where returning from background is flaky. The handler is idempotent and cheap (no-op when healthy), so double-firing is harmless.
- **Force path bypasses the two `ensureConnection` guards.** `reconnectNow()` clears the pending `reconnectTimer` and calls `destroyConnection()` first, so the subsequent `ensureConnection()` sees a null `EventSource` and a null timer and proceeds to open.

## Risks / Trade-offs

- **Unnecessary reconnect on a healthy-but-quiet connection** (no updates and no server heartbeat for >15s) → the 15s window is generous relative to the Floorplan's 1s `minInterval`; a reconnect only re-registers transports and does not flip `_connected` (so no red flash via the 2s poll).
- **`focus` fires often** (e.g. clicking back into an already-visible window) → handler short-circuits when healthy and recently active, so cost is negligible.
- **Timestamp relies on `Date.now()`** → standard browser API, always available in this runtime.

## Migration Plan

Pure client-side behavioural change; no data or API migration. Ships with the next front-end build. Rollback is reverting the two files. Already implemented in `src/lib/sse-client/sseClient.ts` and `src/App.vue`.
