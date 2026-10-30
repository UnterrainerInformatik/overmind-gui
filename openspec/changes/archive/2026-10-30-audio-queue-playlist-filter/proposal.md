## Why

The audio bar's queue popup lists every playlist, and with a growing library (a "Radio"
playlist next to many music playlists) finding one on the kiosk means scrolling. The playlist
editor already has a name filter; the popup, which is where people actually pick a playlist to
play, does not.

## What Changes

- The playlist section of the queue popup gets a clearable text field above the list that
  narrows the playlists to those whose name contains the typed text, case-insensitive, on the
  client.
- No debounce, no server search, no minimum length: people type two or three letters.
- The filter is empty again every time the popup opens.
- When the filter leaves nothing, the section shows a "no matching playlists" text; the queue
  section is never affected by the filter.
- The field does not take focus when the popup opens, so the on-screen keyboard stays closed
  until someone taps it.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `kiosk-audio-bar`: adds a requirement for the playlist filter in the queue and playlist popup.

## Impact

- `src/components/audio/AudioQueueDialog.vue` (filter field, filtered list, no-match text,
  reset on open).
- `src/locales/de-AT.json`, `src/locales/en-US.json`: reuses the existing
  `page.kiosk.audio.editor.filter` / `editor.noPlaylists` texts, or adds popup-level keys if the
  wording has to differ.
- Browser suite `kiosk-audio-bar.mjs` in the verification harness gets filter scenarios.
- No backend or API change.
