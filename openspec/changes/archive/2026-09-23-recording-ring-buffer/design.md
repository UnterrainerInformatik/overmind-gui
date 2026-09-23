## Context

- A node's storage figures (`storageUsedBytes`, `storageTotalBytes`) come from
  Frigate's `/api/stats` → `service.storage["/media/frigate/recordings"]`. They are
  read only by the connection test (`CameraConnectionTester`). The GUI shows them
  as a bare "x GB of y GB" in `CameraNodeDialog.vue`.
- Recordings are limited only by retention in days (per camera, falling back to
  the node's default). Frigate's own last-resort cleanup deletes the oldest
  recordings once less than about an hour of recording space is left, regardless
  of retention.
- The central archive has `OVERMIND_ARCHIVE_BUDGET_BYTES` and
  `OVERMIND_ARCHIVE_WARNING_BYTES`. `ArchiveBudget` refuses saves with 507 once
  the budget is reached and never evicts. The GUI currently shows no archive usage
  at all.
- The server is a separate repository. As with earlier camera and archive
  changes, this GUI change fixes the contract it needs, writes it down here, and
  builds against it. The server work is a sibling change.

## Goals / Non-Goals

**Goals:**
- One gauge component, used compact in the node list and full in the node detail,
  showing ring fill level and disk headroom as two separate facts.
- Thresholds that warn about the only real danger: the disk running out
  underneath the ring. A full ring is not an alarm.
- An archive fill level on the archive page, with ring semantics stated plainly.
- The contract for both written down precisely enough for the server change.

**Non-Goals:**
- Setting the ring size from the GUI. It lives in the server's docker-compose on
  purpose (operator decision, not a kiosk decision).
- Per-camera shares of a node's ring. The ring is one budget per node, and the
  oldest recordings go first whichever camera they belong to.
- Push notifications or alerts outside the page. The colour on the Kameras page
  is the warning.
- Protecting individual archive entries from eviction ("pin forever"). The
  operator accepted plain ring semantics.

## Decisions

### D1: Ring size is configured on the server, enforced by the server

`OVERMIND_RECORDING_RING_BYTES` sets the default ring size for every node.
`OVERMIND_RECORDING_RING_OVERRIDES=<nodeName>=<bytes>,…` overrides it per node,
following the same pattern as `OVERMIND_BACKOFF_OVERRIDES`. Unset or blank means
no ring, so recordings are bounded by retention alone. A server job polls each
enabled node every 5 minutes. It reads `/api/stats` and
`/api/recordings/storage` (per-camera `usage` in MiB and `bandwidth` in MiB/h),
and when the recordings exceed the ring size it deletes the oldest recordings
until they are back under it. The poll also refreshes the node's storage figures,
so they stop depending on someone pressing "Test".

*Alternative considered:* making the ring the size of the recordings volume in
the node's own compose and letting Frigate's low-space cleanup do the eviction.
It is simpler, but then a full ring and a full disk are the same state, so the
red warning would be permanently on. It is also invisible to the server. The
operator chose the server-side variant.

*Open for the server change:* which Frigate call deletes the oldest recording
segments. If Frigate offers no direct call, a fallback is to delete the oldest
review items and events together with their media. Neither choice is visible in
the GUI contract.

### D2: The node contract (guessed, to be confirmed by the server change)

`NodeJson` gains the fields below. Every field is absent or null when unknown, and
all byte figures are whole bytes.

| Field | Meaning |
| --- | --- |
| `recordingRingBytes` | effective ring size for this node; null = no ring configured |
| `recordingsBytes` | what the recordings occupy (sum of Frigate's per-camera `usage`) |
| `recordingRateBytesPerHour` | current recording rate (sum of per-camera `bandwidth`) |
| `storageReportedAt` | ISO timestamp of the reading all storage figures come from |

The existing `storageTotalBytes` and `storageUsedBytes` keep their meaning: the
filesystem the recordings live on. Disk free = total − used.

### D3: Headroom arithmetic and thresholds

- `diskFree = storageTotalBytes − storageUsedBytes`
- `ringFree = recordingRingBytes − recordingsBytes` (clamped at 0), or ∞ without a ring
- `headroomHours = diskFree / recordingRateBytesPerHour`
- **Danger applies** only when `diskFree < ringFree`, i.e. the disk runs out first.
- Colour when danger applies: `< 1 h` → red (`error`), `< 24 h` → yellow
  (`warning`), otherwise neutral. When no danger applies, the colour is always
  neutral.
- `ringDays = recordingRingBytes / (recordingRateBytesPerHour × 24)`.
- Rate null → no hours, no colour. Rate 0 → "nothing is being recorded", no colour.

The 1 h threshold is the point where Frigate's own emergency cleanup takes over,
so red means "the retention you set no longer holds". The 24 h threshold gives
at least a working day to react. Both live as named constants in `cameraUtils`,
next to the arithmetic, which stays pure functions. The project has no unit-test
runner, so the arithmetic is checked through the browser verification harness
against mocked node figures covering each band.

### D4: The archive contract (guessed)

`GET /archive/usage` → `{ capacityBytes, usedBytes, oldestStartTime }`.
`oldestStartTime` is omitted when the archive is empty. The route is unconfigured
exactly like the other archive routes when the archive store is not set up. The
server evicts by oldest **save time**, which is first in, first out for a ring. The
page shows the oldest entry's `startTime` because that is the date a user
recognises, and in practice the two are close, because an event can only be
saved within its node's retention. `OVERMIND_ARCHIVE_BUDGET_BYTES` becomes the
capacity. `OVERMIND_ARCHIVE_WARNING_BYTES` loses its purpose and is dropped by the
server change.

### D5: One gauge component, two densities

`RecordingStorageGauge.vue` takes a node (or plain figures) and a `dense` prop.
The dense form is a thin two-segment bar (ring fill, disk headroom colour) plus
one line of text, for the node list row. The full form has two labelled
`v-progress-linear`s with text, the stale notice and the "ring larger than disk"
notice, for the detail dialog. The archive page reuses the ring half of the gauge
(fill level only, no disk headroom), passing its figures in directly. The headroom's
colours use Vuetify theme names (`error`, `warning`) so dark mode follows. The
ring bar is a fixed neutral `blue-grey lighten-1` rather than `primary`: this
installation's `primary` is `#3A3A3A`, which all but vanishes on a dark card
(found in the browser harness during apply).

### D6: Displaced saves need no special handling in the GUI

An evicted entry simply disappears from `/archive/items`. The events page already
derives "saved" from whether an archive entry exists, so a displaced event becomes
savable again without new code. Only the wording changes: the 507 path in the save
failure message becomes unreachable, and the save confirmation must not say
"forever".

## Risks / Trade-offs

- **Deliberately kept events can now be lost** → the archive page says so plainly,
  and the fill level plus the "reaches back to" date let a user see it coming. This
  was the operator's explicit call.
- **The guessed contract may differ from what the server ships** → every new field
  is optional in the GUI, so a server without them shows "unknown", which is
  exactly the behaviour already specified. The fields are confirmed against the
  server change before archive, as with `event-archive`.
- **The recording rate fluctuates** (motion, night) → hours and days are stated as
  "about" and rounded, and the 24 h yellow band absorbs the noise.
- **A 5-minute poll means the ring overshoots slightly** → negligible against
  ring sizes in hundreds of GB. It is noted in the server change, not a GUI
  concern.
- **Stale figures** when the server cannot reach a node → the reading's age is
  shown, and past 1 h it is marked out of date but keeps its colour.
