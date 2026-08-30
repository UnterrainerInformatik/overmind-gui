## Context

`KioskPersonen.vue` renders `KioskLinkPanel` (the back button) and
`KioskVideoStreamPanel` side by side inside a `v-container fluid class="d-flex
flex-wrap"`. `updateVideoSize()` sizes the video from
`window.innerWidth`/`window.innerHeight` alone, with no awareness of the
back-button panel's width. Whenever the two panels' combined width exceeds
the viewport, the `flex-wrap` class breaks them onto two lines, so the
back button renders full-width above the video instead of beside it — and
resizing the window flips between the two layouts at the wrap breakpoint.

`KioskPanel` (used by `KioskLinkPanel`) has a `min-width` of `140px` and no
explicit height, sitting inside a plain flex row with no `align-items`
override — i.e. the browser default of `align-items: stretch` already
applies whenever the row doesn't wrap. Other `Kiosk*` video pages
(`KioskVideo.vue`, `KioskCamera.vue`, ...) use the same markup pattern but
a fixed video size, so they never hit this — only the Personen page's
dynamic `updateVideoSize()` triggers the wrap. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- The back-button panel and the video panel always stay in a single row
  (back button left, video right) at any viewport size, matching
  [[project_kiosk_mode_devices]] (tablet, mobile, and PC).
- The back-button panel's height always matches the video panel's height.
- The video's target size accounts for the space the back button
  actually occupies, so the row fits without relying on wrap-avoidance
  tricks like `overflow: hidden`.

**Non-Goals:**
- Vertically centering the back button's icon/text inside its now-tall
  column is cosmetic polish, not required by the bug report; left as-is.
- Changing the layout of other `Kiosk*` pages that reuse
  `KioskLinkPanel`/`KioskPanel` — they use fixed video sizes and don't
  exhibit this bug.
- Imposing a minimum video width/size floor on very narrow viewports.

## Decisions

1. **Remove `flex-wrap` from the container in `KioskPersonen.vue`.**
   Flexbox's default `flex-wrap: nowrap` then keeps both panels on one
   row unconditionally, and the browser's default `align-items: stretch`
   (already in effect, nothing else sets `align-items`) makes the
   back-button panel's height automatically match the taller video panel
   — no extra CSS needed.
   *Alternative considered*: keep `flex-wrap` and instead prevent
   wrapping with a media query or `overflow-x` rule. Rejected — more code
   for the same result, and it fights the layout instead of removing the
   thing that causes it.

2. **Reserve the back-button panel's actual rendered width in
   `updateVideoSize()` by measuring it via a template ref**, rather than
   subtracting a hardcoded pixel constant, before computing the video's
   16:9 target size from the remaining width.
   *Alternative considered*: hardcode a constant (e.g. `200`) for the
   reserved width. Rejected — it would silently drift out of sync if
   `KioskPanel`'s margin/padding/`max-width` ever changes, with no
   failure signal.

3. **Let the video shrink freely on narrow viewports; don't add a minimum
   video width.** `KioskPanel`'s existing `min-width: 140px` already
   guarantees the back button itself never gets squeezed away, which is
   the requirement this change is fixing. The video simply gets smaller
   on very narrow screens.
   *Alternative considered*: add a floor to the video's computed width
   and let the back button shrink/wrap if both can't fit. Rejected —
   that reintroduces the exact wrap behavior this change removes.

## Risks / Trade-offs

- [Risk] Measuring the back-button ref's width right in `mounted()` could
  read `0` before the DOM has laid out. → Mitigation: read it after
  `this.$nextTick()`, same as the existing `updateVideoSize()` call on
  mount.
- [Risk] On very narrow phone widths, the video could shrink to an
  impractically small size once the back button's width is reserved. →
  Mitigation: accepted trade-off — keeping the back button reachable and
  full-height takes priority; revisit with a min video width later if a
  real device shows this in practice.

## Migration Plan

Pure front-end layout change scoped to `KioskPersonen.vue` (and reading,
not modifying, `KioskLinkPanel`/`KioskPanel`). No data migration. Ships
with the normal build; rollback is reverting the commit.
