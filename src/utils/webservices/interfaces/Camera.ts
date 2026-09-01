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
 */
export interface Camera extends LastKnownStatus {
  id: number;
  nodeId: number;
  displayName: string;
  frigateKey: string;
  sourceUrl: string;
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
  username: string | null;
  password?: string;
  usedOnLivePage: boolean;
  usedOnEventsPage: boolean;
  sortOrder: number;
  enabled: boolean;
}
