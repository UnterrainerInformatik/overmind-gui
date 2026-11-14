## Why

When someone opens the Music Assistant web UI in a browser (or the MA mobile app / PWA), MA
registers a **web player** for it. Today Overmind cannot play on it: the GUI only knows the main
group and the rooms' players, so a player that no room is configured for is invisible. The user
wants such web players picked up **automatically** as extra play targets, without assigning them
to a room. There are at most about 3 of them at a time.

## What Changes

- The audio state gets a list of room-less **web players** (`AudioState.players[]`, each
  `{targetId, name, available, playback, volume}`), read from the server's `audioState` and the
  SSE `audio-state` event. A server that does not send `players` yet gives an empty list.
- A third target kind **`player`**, remembered per device as `'player:<targetId>'` next to
  `'main'` and `'room:<roomId>'`.
- The audio plan popup's stream strip shows one extra **stream card per web player**, after the
  rooms, with its own icon and a fixed web player colour. Web players are not drawn on the plan
  map, because they have no room.
- The kiosk audio bar shows a selected web player with its MA name, the web player icon and its
  colour. Play / pause / next / previous, seek, volume, the queue popup and the playlist editor's
  play button work for it unchanged, because they are addressed by `targetId`.
- When the selected web player goes away (its browser tab was closed), the bar and an open queue
  popup **silently switch to the main group**. Unlike a vanished room, the remembered choice is
  kept: when a player with the same id comes back, it is selected again.
- Server side (separate change in the server repository, not part of this repo): fill
  `players[]` from MA players with `provider == "sendspin"` and `device_info.model` in
  {"Web Player", "Web Browser", "Mobile Application", "PWA"} that no room references, and allow
  their ids on the `/audio/targets/{targetId}/...` routes. Web players stay solo targets; they are
  never grouped.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `kiosk-audio-bar`: web players become selectable targets; the remembered selection may be a
  web player and survives its absence; the bar shows the web player kind.
- `kiosk-audio-plan-popup`: the stream strip gets one card per web player after the rooms; web
  players are not on the plan map.

## Impact

- `src/utils/webservices/audioService.ts`: `AudioState.players`, `AudioWebPlayer`,
  normalization, `WEB_PLAYER_COLOR`.
- `src/utils/audioTarget.ts`: kind `player`, stored-selection parsing, `resolveTarget`, a
  separate "selection unavailable" vs. "selection invalid" notion for the fallback.
- `src/components/audio/KioskAudioBar.vue`, `AudioPlanDialog.vue`, `AudioStreamCard.vue`:
  web player cards, icon and fallback handling. `AudioQueueDialog.vue` and
  `AudioPlaylistEditor.vue` only follow the resolved target.
- i18n: no new texts expected (the name comes from MA).
- Depends on the server change for real data. Without it the GUI behaves exactly as today
  (no `players` → no extra cards), so this change can be deployed first.
