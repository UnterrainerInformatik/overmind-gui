## Why

Nothing today bounds how much disk the recordings take, and nothing warns before a
disk runs out. A node's recordings are limited only in days, so the space they
need is a product of retention × bitrate that nobody sees. The node detail shows
"used / total" only after a connection test. When the disk does fill, Frigate's own
emergency cleanup deletes the oldest footage regardless of the retention that was
set. The central archive has a byte budget, but a full archive refuses every new
save, including the automatic ones, which is the worst moment to stop recording.

The operator wants both stores to behave as ring buffers with a size set in the
server's docker-compose. Full is then a normal state: the oldest footage gives way
to the newest. The GUI must make the size, the fill level and the real danger (a
disk running out underneath the ring) visible at a glance.

## What Changes

- **Per node, a recording-storage gauge** in the node list (compact) and in the
  node detail (full). It shows two separate facts:
  - **Ring buffer fill level:** what the recordings occupy against the node's
    configured ring size, and roughly how many days of footage the ring holds at
    the current recording rate. A full ring is shown as normal ("oldest recordings
    are overwritten"), not as an alarm.
  - **Disk headroom:** how long the physical disk under the recordings lasts at the
    current recording rate. **Red** under 1 hour, **yellow** under 24 hours,
    otherwise neutral. This only counts as danger when the disk would run out
    before the ring is full (the ring is set larger than the disk can hold, or
    something else is filling the disk). While the ring catches the growth, the
    headroom is not an alarm.
  - Every figure the server does not report is shown as unknown, never as zero.
    Without a known recording rate there are no hours and no colour, only bytes.
- **The central archive shows its own fill level** on the archive page. That
  covers used against capacity and how far back the archive currently reaches
  (its oldest entry).
- **BREAKING (behaviour, server side):** a full archive no longer refuses a save.
  The server evicts the oldest archive entries to make room. Saving an event into
  a full archive therefore succeeds. The archive page says that a full archive
  makes room by dropping its oldest entries, so a user who keeps something
  important knows it will not last forever. This reverses the event-archive
  decision "nothing is ever evicted", at the operator's explicit request.
- **Contract assumptions** for the server fields and route this needs are written
  down in design.md. The server work itself (ring enforcement on nodes, eviction in
  the archive, the new fields) is a separate change in `java-overmind-server`.

## Capabilities

### New Capabilities
- `node-recording-storage`: the per-node recording-storage gauge, covering ring
  fill level, disk headroom in hours, colour thresholds, how unknown figures and
  an unconfigured ring are shown, and how current the figures are.

### Modified Capabilities
- `camera-connections-page`: the node list entry carries the compact gauge, and the
  node detail's "storage use" fact is replaced by the full gauge.
- `kiosk-archive-page`: the archive page shows the archive's fill level and how far
  back it reaches, and states that a full archive drops its oldest entries.
- `event-archive-saving`: saving into a full archive is no longer a refusal. The
  save succeeds and the oldest entries give way.

## Impact

- **GUI code:** `src/components/CameraNodeDialog.vue`, the node list in
  `src/views/KioskCameras.vue`, a new gauge component, `src/utils/cameraUtils.ts`
  (thresholds, hours/days arithmetic), `src/utils/webservices/interfaces/CameraNode.ts`,
  `src/utils/webservices/archiveService.ts` (new usage read),
  `src/views/KioskPersonenArchiv.vue`, and both locale files.
- **Server (separate change, `java-overmind-server`):** new env
  `OVERMIND_RECORDING_RING_BYTES` plus per-node overrides, a periodic enforcement
  job against Frigate, new node fields, `GET /archive/usage`, and archive eviction
  replacing the 507 refusal in `ArchiveBudget`. `OVERMIND_ARCHIVE_BUDGET_BYTES`
  becomes the archive ring's size.
- **Docs:** `java-overmind-server/docs/video-capabilities.md`, sections 7 and 11 and
  the node facts section, must describe the ring behaviour and the gauge.
