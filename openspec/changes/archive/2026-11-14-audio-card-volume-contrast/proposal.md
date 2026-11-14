## Why

On the stream cards of the new audio plan popup, the volume slider's filled track and its round
thumb are barely visible: the slider sets no colour, so it takes the theme's `primary`, which is
`#3A3A3A` in the dark theme, almost the tone of the card behind it (dark background with a 14 %
grey layer). The user can hardly see the current level or where to grab the knob.

## What Changes

- The volume slider on every stream card gets an explicit, high-contrast colour for the filled
  track and the thumb, chosen per theme (dark and light), and a clearly visible unfilled track.
- The colour is the same for every card; the card's stream colour stays on the band, name icon
  and selection frame.
- No behaviour change: dragging, live sending and holding the level stay as they are.

## Capabilities

### New Capabilities

### Modified Capabilities
- `kiosk-audio-plan-popup`: adds a requirement that the card's volume slider stands out clearly
  from the card in both themes.

## Impact

- `src/components/audio/AudioStreamCard.vue` (slider colour props / styles).
- Not affected: the audio bar's own sliders (`KioskAudioBar`), the plan map, the server API.
