# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

## Standing open point — the archive has never met a real server

Not a proposal: an acceptance run that no change may carry off into the archive
with it. Every archive shape this GUI uses was checked on 2026-09-07 against the
**source** of `java-overmind-server` (change `event-archive`), never against a
deployed server with a real node behind it. Still to be done, once the routes
are served: save an event, see it marked, find it in the archive view, play it,
and delete it again.

It came out of `archive-save-button` (task 7.4 there) and now covers the archive
view of `kiosk-archive-page` as well. What the server knows about it is in
`java-overmind-server/ai/draft-archive-from-gui.md`; the customer-facing side is
`java-overmind-server/docs/video-capabilities.md`.

---

## B — Aufzeichnungs-Auftrag anlegen (nach der Archiv-Ansicht)

Kein Start/Stop-Knopf am Livebild, sondern ein **Auftrag mit Enddatum**: „Kamera 2 ab
jetzt durchgehend aufzeichnen bis 2026-03-02 14:04:55." Das GUI braucht dafür ein
Formular in der Kameraverwaltung, eine Liste laufender Aufträge mit Restlaufzeit, und
vorzeitiges Beenden.

Dazu die **Kundenwahl der Ablage** — am Standort oder zentral — mit dem Hinweis, der die
Entscheidung tatsächlich trifft: rund 30 GB pro Kameratag, bei zentral dauerhaft über den
Uplink des Standorts.

Die aufgezeichneten Bereiche erscheinen anschließend in der Archiv-Ansicht
(`kind: "recording"`). Die Stream-Wahl (Haupt-/Sub-Stream) ist im Backend zunächst auf
`main` beschränkt — Feld vorsehen, aber nicht anbieten, bis das Backend es meldet.

---

## C — Recording ring buffer, server side (java-overmind-server)

The server counterpart of GUI change `recording-ring-buffer`, which is built
against a **guessed contract** (its design.md, D1–D4). Propose it in
`java-overmind-server`; confirm every field below there before that GUI change
is archived. Until the server ships, every figure is absent and the GUI shows it
as unknown.

**Node ring (D1).**
- `OVERMIND_RECORDING_RING_BYTES` — default ring size for every node. Unset or
  blank = no ring (recordings bounded by retention alone).
- `OVERMIND_RECORDING_RING_OVERRIDES=<nodeName>=<bytes>,…` — per-node override,
  same pattern as `OVERMIND_BACKOFF_OVERRIDES`.
- A job polls every enabled node **every 5 minutes**: reads Frigate
  `/api/stats` and `/api/recordings/storage` (per-camera `usage` MiB,
  `bandwidth` MiB/h). When the recordings exceed the ring size, it deletes the
  oldest recordings until they are back under it, whichever camera they belong
  to. The same poll refreshes the node's storage figures, so they no longer
  depend on a connection test.
- **Open:** which Frigate call deletes the oldest recording segments. Fallback
  if there is none: delete the oldest review items / events with their media.

**Node fields (D2)** on `NodeJson`, each omitted or null when unknown, bytes as
whole bytes:
- `recordingRingBytes` — effective ring size; null = no ring configured
- `recordingsBytes` — sum of Frigate's per-camera `usage`
- `recordingRateBytesPerHour` — sum of per-camera `bandwidth`
- `storageReportedAt` — UTC `LocalDateTime` of the reading all storage figures
  come from
- `storageTotalBytes` / `storageUsedBytes` keep their meaning (the filesystem
  the recordings live on), now refreshed by the poll.

**Archive usage (D4).**
- `GET /archive/usage` → `{ capacityBytes, usedBytes, oldestStartTime }`;
  `oldestStartTime` (UTC `LocalDateTime` of the oldest entry's start) omitted on
  an empty archive; unconfigured exactly like the other archive routes.
- **Eviction replaces the 507** in `ArchiveBudget`: a save into a full archive
  succeeds, and the oldest entries by **save time** are dropped to make room.
  `OVERMIND_ARCHIVE_BUDGET_BYTES` becomes the capacity;
  `OVERMIND_ARCHIVE_WARNING_BYTES` loses its purpose and is dropped.
- A displaced entry simply disappears from `/archive/items`; nothing else is
  needed for the events page to offer the event for saving again.

Customer-facing side: `java-overmind-server/docs/video-capabilities.md`
(sections 3, 7, 8, 11), marked 🕓 Geplant until this ships.
