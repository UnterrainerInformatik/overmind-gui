## 1. Layout: keep the row from wrapping

- [x] 1.1 In `src/views/KioskPersonen.vue`, remove `flex-wrap` from the
      `v-container` class list so the back button and video panel always
      stay on one row.
- [x] 1.2 Verify (via the running app or a manual DOM check) that with
      `flex-wrap` removed, the back-button panel already stretches to the
      video panel's height by default (no extra CSS needed).

## 2. Reserve the back button's width when sizing the video

- [x] 2.1 Add a template ref (e.g. `ref="backButton"`) to the
      `KioskLinkPanel` in `KioskPersonen.vue`.
- [x] 2.2 In `updateVideoSize()`, measure the back button's rendered width
      (including its margin) via that ref and subtract it from the
      available width before computing the video's 16:9 target size.
- [x] 2.3 Ensure the first `updateVideoSize()` call in `mounted()` runs
      after `this.$nextTick()` so the ref has a real width to measure.

## 3. Verify

- [x] 3.1 Manually resize the browser window across a wide range of
      widths (including narrow/mobile widths) on the Personen page and
      confirm the back button always stays a full-height left column and
      never appears above the video.
- [x] 3.2 Confirm the back button remains clickable/reachable and the
      video still plays and resizes smoothly during/after resize.
- [x] 3.3 Spot-check that other `Kiosk*` pages using `KioskLinkPanel`
      (e.g. `KioskVideo.vue`, `KioskOverview.vue`) are visually unchanged.
