import { LastKnownStatus } from '@/utils/webservices/interfaces/ConnectionStatus'

/**
 * Whether the camera has actually been written into its node's Frigate yet.
 * A camera entered while its node is unreachable is stored all the same and
 * comes back as `pending` with a reason - see the server's
 * `frigate-provisioning` capability.
 */
export type ProvisioningState = 'provisioned' | 'pending' | 'failed'

/**
 * One camera connection as the registry returns it.
 *
 * `password` is deliberately absent: the server accepts one on write and never
 * echoes it back, so `hasPassword` is all a reader gets - enough for the edit
 * form to say a password is stored without ever holding it.
 *
 * A camera can be pulled from up to three sources, because detect, record and
 * the live view want different streams of it - typically a substream for
 * detection and the main stream for watching. `sourceUrl` is the one that is
 * always there and is what gets recorded; the other two are overrides the node
 * resolves as live = `liveSourceUrl` ?? `sourceUrl` and detect =
 * `detectSourceUrl` ?? `liveSourceUrl` ?? `sourceUrl`. A detection source may
 * even be a different device, which is why it is a URL of its own rather than a
 * flag on the first one.
 */
export interface Camera extends LastKnownStatus {
  id: number;
  nodeId: number;
  displayName: string;
  frigateKey: string;
  sourceUrl: string;
  liveSourceUrl: string | null;
  detectSourceUrl: string | null;
  username: string | null;
  hasPassword: boolean;
  usedOnLivePage: boolean;
  usedOnEventsPage: boolean;
  sortOrder: number;
  enabled: boolean;
  provisioningState: ProvisioningState;
  provisioningReason: string | null;
}

/**
 * The writable fields of a camera. `password` is only ever sent when the user
 * actually typed one: left out, the server keeps whatever it has stored.
 */
export interface CameraWrite {
  nodeId: number;
  displayName: string;
  frigateKey: string;
  sourceUrl: string;
  liveSourceUrl: string | null;
  detectSourceUrl: string | null;
  username: string | null;
  password?: string;
  usedOnLivePage: boolean;
  usedOnEventsPage: boolean;
  sortOrder: number;
  enabled: boolean;
}
