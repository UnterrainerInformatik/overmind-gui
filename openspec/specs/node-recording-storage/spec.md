# node-recording-storage Specification

## Purpose

Shows, per camera node, how full its recording ring buffer is and how long the disk
underneath it lasts at the current recording rate, so a disk running out is seen
before Frigate starts deleting on its own.

## Requirements

### Requirement: Ring buffer fill level per node

For every node whose ring buffer size the server reports, the gauge SHALL show the
space the node's recordings occupy against that size, as a proportion and in
gigabytes. Where the node's recording rate is known, it SHALL also show roughly
how many days of footage the ring holds at that rate.

A full or nearly full ring SHALL be shown as the normal state of a ring buffer,
saying that the oldest recordings are overwritten, and SHALL NOT be coloured as a
warning or an error.

#### Scenario: A partly filled ring
- **WHEN** the server reports a ring size of 500 GB and 200 GB of recordings
- **THEN** the gauge shows the ring 40 % full, with 200 GB of 500 GB

#### Scenario: How long the ring reaches back
- **WHEN** the ring size and the node's recording rate are both known
- **THEN** the gauge states roughly how many days of footage the ring holds at
  that rate

#### Scenario: A full ring
- **WHEN** the recordings occupy the whole ring size or more
- **THEN** the gauge shows the ring as full and says the oldest recordings are
  being overwritten, in the gauge's neutral colour

#### Scenario: No ring configured for the node
- **WHEN** the server reports no ring size for the node
- **THEN** the gauge says that no ring buffer is configured, so recordings are
  bounded only by their retention and by the disk, and shows no fill proportion

### Requirement: Disk headroom in hours of recording

The gauge SHALL show how much free space the disk under the node's recordings
still has and, where the recording rate is known, how many hours of recording
that space holds at the current rate.

The headroom SHALL be coloured **red** below 1 hour of recording and **yellow**
below 24 hours, and neutral otherwise. The headroom SHALL count as a danger only
when the disk would run out before the ring is full. That is the case when no
ring is configured, or when the disk's free space is smaller than the part of the
ring not yet filled. When the ring fills first, the headroom SHALL be shown
neutral whatever its size, because the ring's eviction keeps the recordings from
growing.

#### Scenario: Plenty of headroom
- **WHEN** the disk's free space holds 3 days of recording and the disk would run
  out before the ring fills
- **THEN** the headroom is shown as about 3 days, in the neutral colour

#### Scenario: Less than a day left
- **WHEN** the disk's free space holds 10 hours of recording and the disk would
  run out before the ring fills
- **THEN** the headroom is shown as about 10 hours, in yellow

#### Scenario: Less than an hour left
- **WHEN** the disk's free space holds 40 minutes of recording and the disk would
  run out before the ring fills
- **THEN** the headroom is shown in red, and the gauge says that Frigate will
  start deleting the oldest recordings on its own regardless of retention

#### Scenario: The ring fills before the disk
- **WHEN** the part of the ring not yet filled is smaller than the disk's free space
- **THEN** the headroom is shown in the neutral colour, even if it holds less
  than a day of recording

#### Scenario: The ring is larger than the disk
- **WHEN** the configured ring size exceeds what the recordings plus the disk's
  free space can hold
- **THEN** the gauge says the ring cannot be filled on this disk and the disk
  will run out first, alongside the coloured headroom

#### Scenario: Recording rate unknown
- **WHEN** the node reports its free space but no recording rate
- **THEN** the headroom is shown in gigabytes only, without hours and without a
  colour, and the gauge says the rate is unknown

#### Scenario: Nothing is recording
- **WHEN** the node reports a recording rate of zero
- **THEN** the headroom is shown in gigabytes, the gauge says nothing is being
  recorded, and it is not coloured

### Requirement: Unknown figures stay unknown

Every figure the server does not report, whether ring size, recordings size, disk
free space or recording rate, SHALL be shown as unknown rather than as zero. A
figure derived from an unknown SHALL NOT be shown.

#### Scenario: Node reports no storage at all
- **WHEN** the server reports none of the storage figures for a node
- **THEN** the gauge says the node's storage is unknown and shows no proportion,
  no hours and no colour

### Requirement: The figures say how current they are

The gauge SHALL show when the server last read the storage figures from the node.
When that reading is older than 1 hour, the gauge SHALL say that the figures may
be out of date. It SHALL keep the colour the last reading earned: a disk that was
running out when last seen is no less alarming for not having been seen since.

#### Scenario: Fresh figures
- **WHEN** the figures were read 5 minutes ago
- **THEN** the gauge shows them with that time and colours the headroom by the
  thresholds

#### Scenario: Stale figures
- **WHEN** the figures were read 3 hours ago
- **THEN** the gauge shows them with that time, says they may be out of date, and
  keeps the headroom's colour from that reading
