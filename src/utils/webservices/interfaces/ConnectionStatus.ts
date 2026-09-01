/**
 * The stored outcome of the last connection test on a camera or a node, and the
 * result of triggering one. Both the camera and the node carry the same three
 * fields, so they live here rather than being written out twice.
 *
 * A test that fails is not an HTTP error: the server answers with `error` and a
 * human-readable `reason`, which is what the page puts on screen.
 */
export type ConnectionStatus = 'ok' | 'error'

export interface ConnectionTestResult {
  result: ConnectionStatus;
  reason: string | null;
  lastStatusAt: string | null;
}

export interface LastKnownStatus {
  lastStatus: ConnectionStatus | null;
  lastStatusAt: string | null;
  lastStatusReason: string | null;
}
