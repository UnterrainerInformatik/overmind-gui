/**
 * The stored outcome of the last connection test on a camera or a node, and the
 * result of triggering one. Both the camera and the node carry the same fields,
 * so they live here rather than being written out twice.
 *
 * A test that fails is not an HTTP error: the server answers with `ERROR` and a
 * human-readable `reason`, which is what the page puts on screen. The server's
 * enums are uppercase (`OK` / `ERROR`); camerasService lowers them on the way
 * in, so everything below this line compares lowercase.
 */
export type ConnectionStatus = 'ok' | 'error'

export interface ConnectionTestResult {
  result: ConnectionStatus;
  reason: string | null;
}

export interface LastKnownStatus {
  lastStatus: ConnectionStatus | null;
  lastStatusAt: string | null;
  lastStatusReason: string | null;
}
