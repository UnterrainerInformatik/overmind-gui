## Why

Music in the house is about to be played through several Sendspin speakers, one per room, all
driven by Music Assistant (MA). Today the kiosk can only reach MA through the full embedded MA UI
behind the "Audio" tile, which is too heavy for "pause", "louder" or "next track". Everyday control
belongs on every kiosk page, one tap away. The server side (`audio-music-assistant-bridge` in
`java-overmind-server`) now owns the MA connection, the room model and the `/audio` REST + SSE
contract, so the GUI can build its controls on that without an MA token in the browser.

This is change A of three (A bar → B map integration → C playlist editor).

## What Changes

- A **player bar fixed at the bottom of every kiosk page** (not on the audio iframe page and not
  outside kiosk mode). Left to right: target selector · title/artist · previous · −10 s ·
  play/pause · +10 s · next · draggable progress slider (seek) · volume · radio button.
- To make room, **every `KioskLinkPanel` becomes half as high** (icon next to the text instead of
  above it); the bar is as high as one of those halved tiles. The kiosk settings gear moves up so it
  is not covered by the bar.
- **Target selector**: a popup listing the main group and every solo room, each in its own fixed
  colour from the server's room table (the main group in a distinct colour of its own); the bar
  shows the colour of the sink it controls. The popup also holds a volume slider per room and the
  in/out-of-group toggle per room (Esszimmer's toggle shown disabled because it is pinned).
- The chosen target is **remembered per device** in `localStorage` (guarded); default and fallback
  is the main group, also when the remembered room has rejoined the group or no longer exists.
- **Tap on the title** opens a queue popup: jump to another queue entry, or switch to a playlist
  (replaces the queue). This popup is the later entry point to the playlist editor (change C).
- **Radio button** opens a popup with the 8 quick-select stations; a tap plays the station on the
  current target.
- Playback position is **interpolated locally** from `elapsed` + `elapsedAt`; while the user drags
  the slider, incoming updates do not move the knob.
- State comes from the new **`audio-state` SSE event**, with `GET /audio/state` as fallback.
- The SSE client library gains a way to **listen to named server events** (beyond
  `transport-update`), kept across reconnects; subscribing to one also opens the connection.
- A new `audioService` wraps the `/audio` REST routes used by the bar.

## Capabilities

### New Capabilities
- `kiosk-audio-bar`: the bottom player bar on kiosk pages, its target selector with room volume and
  group toggle, the queue/playlist popup, the radio popup, target persistence, position
  interpolation and the state source (SSE + fallback).

### Modified Capabilities
- `sse-transport-client`: the client can register listeners for named SSE events other than
  `transport-update`; such a listener opens the connection lazily, the same way a transport does,
  and survives reconnects.

## Impact

- **New code**: `src/components/audio/` (bar + popups), `src/utils/webservices/audioService.ts`,
  a shared reactive audio state module (also needed by change B), new `audio*` endpoints in
  `src/store/rest.ts`, German/English strings.
- **Changed code**: `src/App.vue` (mounts the bar, reserves space at the bottom, moves the settings
  gear), `src/components/KioskLinkPanel.vue` (half height — visible on every kiosk page),
  `src/lib/sse-client/sseClient.ts` (named-event listeners).
- **Backend dependency**: the `/audio` contract from `java-overmind-server` →
  `audio-music-assistant-bridge` (its specs are the contract, including `Playlist.uri` for
  `playMedia`). Until the backend is deployed the bar shows an
  "audio unavailable" state instead of failing.
- **No change** to `KioskAudio.vue` (the hidden MA iframe page stays as it is).
