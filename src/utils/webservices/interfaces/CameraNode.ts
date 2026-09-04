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
}

/** The writable fields of a node; the server assigns and owns the rest. */
export interface CameraNodeWrite {
  name: string;
  frigateBaseUrl: string;
  streamBaseUrl: string | null;
  enabled: boolean;
}
