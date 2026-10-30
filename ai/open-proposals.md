# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

---

## Audio — integrated kiosk controls (remaining two changes)

Frontend half. The server change's specs in
`java-overmind-server/openspec/changes/audio-music-assistant-bridge/specs/`
(after archive: `java-overmind-server/openspec/specs/`) are **authoritative** for the REST/SSE contract, the room model and the
behaviour rules (main group, Esszimmer pin, no auto-regrouping, light link =
mute/unmute only, radio = first 8 of MA playlist `Radio`). Planned 2026-10-30
with Gerald. The existing `KioskAudio.vue` (MA iframe behind the "Audio" tile)
stays as it is — that is the hidden route for basic setup.

Suggested order: backend first, then A → B → C. Each is its own change.
A (`kiosk-audio-bar`) is done — see `openspec/changes/archive/2026-10-30-kiosk-audio-bar/`.

### B — `kiosk-light-and-sound`: map integration

- The overview tile "Licht" becomes **"Licht & Sound"** (`linkLights`), same route.
- Every room with a speaker gets two extra buttons on the map:
  - **group toggle** — takes the room out of the main group; tapping again puts it
    back. Esszimmer: shown as pinned, not tappable.
  - **light link** (`Licht verknüpft`) — on: the speaker follows the room light
    (light on → unmuted, light off → muted). Logic runs on the server.
- Rooms, their speakers and the **button coordinates come from the server's new
  room table** (`AudioState.rooms[].buttonX/buttonY`; rooms are m:n with
  appliances, speakers are Sendspin dummy appliances — several per room act as
  one, the room is always the unit) — nothing hard-coded in
  the view. Gerald fills rooms and memberships once the devices are built.

### C — `kiosk-playlist-editor`: full-screen playlist editing

- Full-screen popup, opened from the queue popup in A.
- Playlist list: open, **create**, **rename**, **delete** (with confirm).
- Inside a playlist: track list, **remove** tracks, **reorder** (drag), and a
  **search** (tracks/albums/artists) to pick tracks and **add** them.
- **No save button** — every action is written immediately and the list reflects
  the server answer; errors are shown and the list reloads.
- Playlists MA marks as not editable (e.g. provider playlists) are shown
  read-only.
- Touch-first: large targets, works on tablet/mobile/PC widths.
