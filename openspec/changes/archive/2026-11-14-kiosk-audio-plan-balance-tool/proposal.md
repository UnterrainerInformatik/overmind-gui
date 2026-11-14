## Why

The server can keep a balance between the speakers of a group room (a stereo pair such as
"Wohn-Esszimmer"): it reports each room's `speakers` with their levels and `balanceSupported`,
and sets one speaker with `PUT /audio/rooms/{roomId}/speakers/{playerId}/volume` (server change
`audio-speaker-reconnect-restore-and-balance`, capability `audio-speaker-balance`). The kiosk has
no control for it, so the balance can only be changed in the MA web UI, where the server then
adopts it. The audio plan popup (the house overview of all players) is where every other room
setting lives, so the balance belongs there too.

## What Changes

- A sixth tool **Balance** in the audio plan popup's tool bar, after Volume.
- With it active, rooms that support a balance are marked; all others are dimmed and send
  nothing.
- Tapping a balance room opens a small balance panel for that room: one slider per speaker
  (speaker name, level 0..100), dragged with the same live-volume rules as the other volume
  controls, sent to the speaker volume route. The panel closes with its own close control, on a
  tool switch, or when the popup closes.
- The GUI reads `speakers` and `balanceSupported` from `AudioState` tolerantly (missing → no
  balance, as with an older server).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `kiosk-audio-plan-popup`: the tool bar offers six tools (requirements "Full-screen popup sized
  for the kiosk tablets" and "One tool is active and decides what a room does"); new requirement
  "Balance tool sets the levels of a room's speakers".

## Impact

- `src/components/audio/AudioPlanDialog.vue` (tool list, panel host), `AudioPlanMap.vue`
  (Balance tool look and tap), a new `AudioBalancePanel.vue`.
- `src/utils/webservices/audioService.ts` (`AudioSpeaker`, `AudioRoom.speakers`,
  `balanceSupported`, `setSpeakerVolume`), `src/store/rest.ts` (route `audioRoomSpeakerVolume`).
- Locales `de-AT.json` / `en-US.json` (tool name, panel texts).
- Backend: nothing to do, the route and state fields are deployed.
