# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

## EQ tool in the audio plan popup, next to Balance

Wanted (Gerald, 2026-11-28). **Needs the server first:** proposal **H** in
`java-overmind-server/ai/open-proposals.md` (capability per room, `GET/PUT
/audio/rooms/<id>/eq`, speaker → ESPHome host table, re-apply after reconnect). Turn this
into a change only once that server change exists and its frontend brief
(`ai/draft-…-for-frontend.md` there) is written; the route and field names below are
the server proposal's working names, not final.

### UI

Built exactly like the Balance tool (openspec change `kiosk-audio-plan-balance-tool`):

- **One** new tool `eq` in `AudioPlanDialog.vue`'s `tools` list, after `balance`. Not one
  tool per room or group.
- On the plan map (`AudioPlanMap.vue`) the rooms with an EQ get a mark and full opacity,
  the others are dimmed and do nothing on tap (like `hasBalance` → new `hasEq(room)` in
  `src/utils/audioEq.ts`, false on an older server that sends no capability).
- Tapping a room opens **its panel at the bottom** (`audio-plan-bottom`, like
  `AudioBalancePanel`) → new `AudioEqPanel.vue`; one panel per room, a group room
  (Wohn-Esszimmer: 2 satellites + sub) is one room, not one panel per speaker. The open
  room is outlined; the panel closes when the room loses its capability or the tool changes.

### Panel content by capability

- **`bands`** (Bad, Keller/Vorraum, Zimmer Stefan, Zimmer Alex today): one vertical slider
  per band. Labels, range and step come from the server (today 15 bands, 20 Hz–16 kHz,
  −15…+15 dB, step 1); do not hard-code the count. Optional *Reset* to the house curve.
- **`crossover`** (Wohn-Esszimmer): one control *Trennfrequenz* 60–150 Hz in 10 Hz steps
  plus *Flat*; show which speaker is satellite (HF) and which is sub (LF). The server
  writes both sides, so the GUI sends one value.
- **`none`** (Keller/Hauptraum, Apollo CAST-1): not tappable.
- **`unavailable`** (a speaker does not answer): tappable, panel says so, controls disabled.

Debounce slider writes (each band is one HTTP call per speaker on the server side) and
follow the SSE `audio` event, so a second panel shows the change.
