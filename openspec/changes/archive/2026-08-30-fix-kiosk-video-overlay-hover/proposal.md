## Why

The clickable photo-capture overlay on live kiosk video streams currently
reacts to hover with a green tint and a scale-up animation. In fullscreen
kiosk use this is very distracting, and it fires just from pointing at
the video with the mouse — no intent to click needed. It communicates
"you can click here" worse than it disturbs.

## What Changes

- The photo-capture overlay's hover state SHALL show a pointer cursor
  (a normal button-like affordance) instead of a green tint and scale
  animation.
- Applies to both stream backends that share this overlay: the go2rtc
  stream (`VideoStreamRtc.vue`) and the plain `<video>` stream
  (`VideoStream.vue`), used on the kiosk Personen and Video pages.
- The click behavior itself (capturing/downloading a still photo) is
  unchanged.

## Capabilities

### New Capabilities
- `video-overlay-hover-affordance`: defines how the clickable
  photo-capture overlay on a live video stream SHALL indicate to the
  user that it's clickable on hover.

### Modified Capabilities

(none)

## Impact

- `src/components/VideoStream.vue`: hover style on the `.video-overlay`
  canvas.
- `src/components/VideoStreamRtc.vue`: hover style on the `.video-overlay`
  canvas (identical logic to `VideoStream.vue`).
- Used by `src/views/KioskPersonen.vue` via `KioskVideoStreamPanel.vue`.
  (`src/views/KioskVideo.vue`, the other originally-planned consumer, was
  removed during this change — see tasks.md section 5 — after its video
  source turned out to be broken independently of this fix.)
