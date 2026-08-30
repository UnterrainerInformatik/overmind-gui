## Why

On the kiosk Personen page, resizing the window sometimes flips the back
button from a left-hand column into a full-width bar stacked above the
video, and back again, because the two panels sit in a plain `flex-wrap`
row whose wrap point isn't accounted for anywhere. The back button must
stay a predictable, always-reachable full-height strip on the left so
kiosk touch users can find it in a fixed spot regardless of screen size.

## What Changes

- Stop the back-button panel and the video panel from ever wrapping onto
  separate rows: the back button SHALL always render as a full-height
  column on the left of the video, never above it, at any window size.
- Reserve the back-button panel's width when computing the video's target
  size, so the two panels always fit side by side instead of overflowing
  and triggering a wrap.
- Stretch the back-button panel to the full height of the row (matching
  the video panel's height) instead of only its own content height.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `kiosk-personen-page`: the back link's layout is now specified to always
  be a full-height left column, never a stacked top bar, at any window
  size — extending the existing "Personen page reachable from the kiosk
  overview" requirement.

## Impact

- `src/views/KioskPersonen.vue`: container layout (no more wrap) and
  `updateVideoSize()` (reserve back-button width when sizing the video).
- `src/components/KioskLinkPanel.vue` and/or `src/components/KioskPanel.vue`:
  may need a height-stretch affordance so the back button fills the row.
