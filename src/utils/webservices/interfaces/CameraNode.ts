import { LastKnownStatus } from '@/utils/webservices/interfaces/ConnectionStatus'

/**
 * A node hosting a local Frigate instance; a camera is bound to exactly one.
 *
 * Named `CameraNode` rather than `Node` so it cannot be mistaken for the DOM's
 * global `Node` in a file that also touches the document.
 *
 * `streamBaseUrl` may be absent, in which case the server falls back to
 * `frigateBaseUrl`.
 */
export interface CameraNode extends LastKnownStatus {
  id: number;
  name: string;
  frigateBaseUrl: string;
  streamBaseUrl: string | null;
  enabled: boolean;
  /**
   * What the node reports about itself, for the detail dialog. All four are
   * null where the node did not report them, and null is shown as unknown
   * rather than as a zero, since "0 bytes of storage" and "the node never said"
   * are different facts about a node.
   */
  frigateVersion: string | null;
  storageTotalBytes: number | null;
  storageUsedBytes: number | null;
  /**
   * The retention the node applies to a camera that states none of its own, in
   * days. Shown as the named fallback under an empty per-camera retention, so
   * "not set" reads as "the node's default applies" rather than as unknown.
   */
  defaultRetentionDays: number | null;
  /**
   * The recording ring buffer and what fills it (openspec change
   * `recording-ring-buffer`). **Guessed contract** - design.md D2 of that
   * change, to be confirmed against java-overmind-server's sibling change
   * before archive. Every one is null when unknown, so a server that does not
   * send them yet shows the gauge as unknown rather than as empty.
   *
   * `recordingRingBytes` is the effective ring size, null meaning no ring is
   * configured; `recordingsBytes` is what the recordings occupy;
   * `recordingRateBytesPerHour` is the current recording rate; and
   * `storageReportedAt` is overmind's UTC `LocalDateTime` of the reading every
   * storage figure on this node comes from, `storageTotalBytes` and
   * `storageUsedBytes` included - those two keep meaning the filesystem the
   * recordings live on.
   */
  recordingRingBytes: number | null;
  recordingsBytes: number | null;
  recordingRateBytesPerHour: number | null;
  storageReportedAt: string | null;
}

/** The writable fields of a node; the server assigns and owns the rest. */
export interface CameraNodeWrite {
  name: string;
  frigateBaseUrl: string;
  streamBaseUrl: string | null;
  enabled: boolean;
}
