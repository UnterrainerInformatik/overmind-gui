## Context

`VideoStream.vue` and `VideoStreamRtc.vue` each wrap their video element
and the `.video-overlay` click-to-capture `<canvas>` in a Vuetify
`v-hover`, and use its `hover` slot prop to inline a `background-color:
rgba(0, 100, 0, 0.2)` tint plus a `transform: scale(...)` on both the
video and the overlay while hovered (`transformHoverIn` /
`transformHoverOut`). The two components are otherwise independent
copies of the same markup/logic (`VideoStreamRtc.vue` drives a
`go2rtc-video` custom element, `VideoStream.vue` a plain `<video>`). See
proposal.md - Why.

`src/views/KioskCamera.vue` has a third, independently-duplicated copy of
this exact pattern for the local-webcam device picker. It isn't part of
the shared `KioskVideoStreamPanel` used by the kiosk Personen/Video pages
the bug report is about, so it's left untouched here (see Non-Goals).

## Goals / Non-Goals

**Goals:**
- Hovering the photo-capture overlay shows a normal pointer cursor and
  nothing else — no color tint, no scale/transform of the video or
  overlay.
- The cursor only changes to a pointer when the overlay is actually
  clickable, i.e. when `photoEnabled` is true.
- Remove the now-dead hover-tracking code (`v-hover`,
  `transformHoverIn`/`transformHoverOut`) from both components rather
  than leaving it unused.

**Non-Goals:**
- `src/views/KioskCamera.vue`'s independent copy of the same hover
  pattern — out of scope for this bug report; can be addressed
  separately if it turns out to bother users there too.
- Any change to the click/photo-capture behavior itself (`takePhoto()`),
  only the hover *indication* changes.

## Decisions

1. **Drop `v-hover` and the `transformHoverIn`/`transformHoverOut`
   styles entirely; use plain CSS `cursor` instead of JS-tracked hover
   state.** A pointer-cursor affordance doesn't need `mouseenter`/
   `mouseleave` tracking — CSS already changes the cursor on `:hover`
   for free. Removing `v-hover` also removes the now-pointless
   scale/tint styling in the same pass instead of leaving dead computed
   properties behind.
   *Alternative considered*: keep `v-hover` and just drop the
   background-color half of the style string, keeping the scale
   transform. Rejected — the scale-on-hover is exactly the other half of
   the "extremely distracting in fullscreen" complaint (see proposal.md
   - Why); keeping it would only halve the fix.

2. **Gate the pointer cursor on the existing `photoEnabled` prop** via a
   bound style/class on the `.video-overlay` canvas (e.g.
   `:style="{ cursor: photoEnabled ? 'pointer' : 'default' }"`), rather
   than a static CSS rule. `photoEnabled` already gates whether
   `takePhoto()` does anything (`VideoStreamRtc.vue:169`,
   `VideoStream.vue:180`); a static `cursor: pointer` would show a
   clickable affordance even when clicking is a no-op.

3. **Apply the same fix identically to both `VideoStream.vue` and
   `VideoStreamRtc.vue`.** They already duplicate this exact markup
   block; keeping them in lockstep here avoids the two components
   diverging further. A shared component/mixin for the overlay is not
   introduced — out of scope for a hover-style bug fix, and the existing
   duplication predates this change.

## Amendment (found during implementation)

While verifying task 3.1/3.2 live, the `.video-overlay` canvas turned out to
have `width: 0px; height: 0px` on both components: its position/size style
read `videoEl.offsetTop/Left/Width/Height` (`$refs.video...` in
`VideoStream.vue`) directly in the template, but plain DOM `offset*`
properties aren't reactive in Vue 2 — the style only re-evaluated once, at
whatever render happened to fire (mount / `isLoading` flip), which was
usually before the stream had laid out to its real on-screen size. The
overlay therefore never actually covered the visible video: hovering the
video showed whatever cursor was under it (not the intended pointer), and
clicks never reached the canvas, so `takePhoto()` never fired. This made
the `video-overlay-hover-affordance` spec's hover scenario unsatisfiable as
originally scoped (decision 2 above assumed the overlay already tracked the
video correctly, only needing a cursor style).

**Fix**: both components already poll every 100ms via their existing
`update()`/`setInterval`. Added a reactive `overlayRect` data property
(`{ top, left, width, height }`), refreshed from the video element's
`offset*` properties each `update()` tick (only reassigned when a value
actually changes, to avoid a needless re-render every tick), and bound the
canvas's position/size style to `overlayRect` instead of reading `offset*`
directly in the template. This keeps the overlay's geometry self-correcting
as the video's real layout settles or changes (e.g. on resize), reusing the
existing poll loop rather than adding a `ResizeObserver` or new interval.

Verified live on `/app/kioskpersonen` (go2rtc stream): overlay now reports
its actual on-screen rect, hover shows `cursor: pointer`, and a click
produces a `data:image/octet-stream;base64,...` download href.
`/app/kioskvideo`'s stream failed to load independently of this change (its
backend request is blocked by CORS — `frig.unterrainer.info` sends no
`Access-Control-Allow-Origin` header — a pre-existing, unrelated backend
issue), so the identical fix in `VideoStream.vue` could not be
live-verified on that page, only code-reviewed against the confirmed fix.

## Risks / Trade-offs

- [Risk] Removing the `v-hover` wrapper changes the component tree
  slightly (one fewer renderless component). → Mitigation: `v-hover`
  only ever rendered its default slot content directly (no wrapper
  element of its own), so the rendered DOM is unaffected; verify visually
  after the change.

## Migration Plan

Pure front-end style/markup change scoped to `VideoStream.vue` and
`VideoStreamRtc.vue`. No data migration. Ships with the normal build;
rollback is reverting the commit.
