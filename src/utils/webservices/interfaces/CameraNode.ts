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
}

/** The writable fields of a node; the server assigns and owns the rest. */
export interface CameraNodeWrite {
  name: string;
  frigateBaseUrl: string;
  streamBaseUrl: string | null;
  enabled: boolean;
}
