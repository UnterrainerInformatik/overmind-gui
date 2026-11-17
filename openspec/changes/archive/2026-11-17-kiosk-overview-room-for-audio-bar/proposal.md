## Why

The audio bar's buttons are 40 × 41 px - small targets on a wall tablet - and the overview has no
vertical slack to make them bigger: on the real tablets (about 1020 × 590 px usable) the overview
ends exactly where the bar begins. At the same time the bar's volume popup is hard to read: a grey
slider on a dark grey card. The switch tiles on the overview are the one place with height to
spare: they are 112-118 px high, almost twice the 60 px link tiles below them.

## What Changes

- The bar's volume slider gets the same accent colours as the volume sliders of the audio plan
  popup (stream cards, balance panel): `#4FC3F7` on the dark theme, `#1976D2` on the light theme,
  with the same stronger track colour. The value below it stays readable on the menu card.
- The blue tiles on the kiosk overview (switch, multi-state and plan tiles) lose a third of their
  height: 78 px instead of 112-118 px, still clearly taller than the 60 px grey link tiles. Their
  icon moves beside the text instead of above it, the way the link tiles did. Only the overview
  changes; the lights, plugs and presence pages keep their tiles as they are.
- The audio bar grows from 41 px to 60 px with the gained height, and its buttons get wider:
  56 px from tablet width up (44 px between 600 and 960 px, 36 px on phones as today). Icons grow
  with them.
- The target selector keeps the room name, now as a second line under the colour dot and icon,
  so it takes less width than today's one-line `● icon Haus`.
- The volume menu's length rule follows the taller bar so the menu still fits above it on short
  screens.

## Capabilities

### New Capabilities
- `kiosk-overview-tiles`: height and layout of the switch, multi-state and plan tiles on the kiosk
  overview, relative to the link tiles.

### Modified Capabilities
- `kiosk-audio-bar`: bar height (41 → 60 px), button widths per screen width, the two-line target
  selector, the volume slider's colours, and the volume slider's length rule on low screens.

## Impact

- `src/styles/_kiosk.scss` - `--kiosk-audio-bar-height`, new overview tile height variable.
- `src/components/audio/KioskAudioBar.vue` - button sizes, target selector layout, volume slider
  colours and length.
- `src/components/audio/AudioStreamCard.vue`, `AudioBalancePanel.vue` - their shared volume colours
  move to one helper the bar uses too.
- `src/views/KioskOverview.vue`, `src/components/KioskPanel.vue`, `KioskSwitchPanel.vue`,
  `KioskMultiStatePanel.vue`, `KioskPlanPanel.vue` - compact tile variant used only by the overview.
- Every kiosk page loses 19 px of height to the taller bar; fixed parts anchored to the bottom
  (settings gear, back buttons, events timeline) follow automatically through
  `--kiosk-bottom-inset`.
- Browser harness: `suites/kiosk-audio-bar.mjs` asserts 41 px today and needs the new numbers.
