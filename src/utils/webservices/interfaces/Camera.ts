import { LastKnownStatus } from '@/utils/webservices/interfaces/ConnectionStatus'

/**
 * Whether the camera has actually been written into its node's Frigate yet.
 * A camera entered while its node is unreachable is stored all the same and
 * comes back as `pending` with a reason - see the server's
 * `frigate-provisioning` capability.
 */
export type ProvisioningState = 'provisioned' | 'pending' | 'failed'

/**
 * What a camera's stream is used for. A camera serves up to three purposes and
 * each one points at exactly one of its streams; several purposes on the same
 * stream is the normal case for a camera that only has one.
 */
export type StreamRole = 'live' | 'detect' | 'record'

/**
 * One named stream of a camera, with whatever a probe has measured about it.
 *
 * Every parameter is nullable and starts out null: a stream that has never been
 * probed is *unknown*, not zero, and the page has to be able to tell those two
 * apart - a 0 fps stream and an unmeasured one look identical otherwise.
 *
 * `settableFields` names the parameters the node will actually write back to
 * the camera, e.g. `['fps']`. Absent or empty means the whole set is read-only:
 * most cameras dictate their stream parameters and only the camera's own web
 * interface can change them, so read-only is the safe default rather than an
 * error state.
 */
export interface CameraStream {
  name: string;
  url: string;
  width: number | null;
  height: number | null;
  fps: number | null;
  bitrateKbps: number | null;
  videoCodec: string | null;
  /** null once probed means the stream carries no audio track at all. */
  audioCodec: string | null;
  /** UTC LocalDateTime of the last successful probe; null = never probed. */
  probedAt: string | null;
  settableFields: string[];
}

/** How much of the camera is recorded, and for how long. */
export interface CameraRecordingSettings {
  enabled: boolean;
  mode: 'continuous' | 'events';
  /** null when the server does not report one; the page shows that as unknown. */
  retentionDays: number | null;
}

/**
 * What detection runs at. All four picture parameters are nullable for the same
 * reason the stream's are: not reported is not the same as off.
 */
export interface CameraDetectSettings {
  width: number | null;
  height: number | null;
  fps: number | null;
  audioEnabled: boolean;
  /** 0-100, higher = less sensitive. One number the backend maps onto Frigate's several motion knobs. */
  motionThreshold: number | null;
}

/**
 * What a stream probe answers with: either the measured parameters, or the
 * reason the node could not read the stream. A failed probe is not an HTTP
 * error - it follows the house shape of the two `/test` endpoints - so both
 * outcomes arrive here as a result rather than as a thrown error.
 */
export interface StreamProbeResult {
  result: 'ok' | 'error';
  reason: string | null;
  /**
   * Only filled on success; the fields a probe measures, in the stream's own
   * shape. `probedAt` is the node's own measurement time and may be null where
   * the server sent none - the caller then falls back to its own clock, so a
   * stream that was just measured never reads as never probed.
   */
  measured: Pick<CameraStream,
    'width' | 'height' | 'fps' | 'bitrateKbps' | 'videoCodec' | 'audioCodec' | 'probedAt' | 'settableFields'> | null;
}

/**
 * One camera connection as the registry returns it.
 *
 * `password` is deliberately absent: the server accepts one on write and never
 * echoes it back, so `hasPassword` is all a reader gets - enough for the edit
 * form to say a password is stored without ever holding it.
 *
 * The server carries two URL fields: `sourceUrl`, which is always there and is
 * what gets recorded, and an optional lower-resolution one for the live view.
 * `liveSourceUrl` below is the latter under this model's name and is derived on
 * read, not stored - a detection source of its own is a third named stream that
 * `roles.detect` points at, which is how the server expresses one.
 */
export interface Camera extends LastKnownStatus {
  id: number;
  nodeId: number;
  displayName: string;
  frigateKey: string;
  sourceUrl: string;
  /** Derived from the server's `subStreamUrl`; never sent back under this name. */
  liveSourceUrl: string | null;
  username: string | null;
  hasPassword: boolean;
  usedOnLivePage: boolean;
  usedOnEventsPage: boolean;
  sortOrder: number;
  enabled: boolean;
  provisioningState: ProvisioningState;
  provisioningReason: string | null;
  /**
   * The camera's streams, `main` first and always present. The server answers
   * them for every camera; `camerasService` derives them from the URL fields
   * above for a server that predates them, so a reader never has to handle
   * their absence.
   */
  streams: CameraStream[];
  /**
   * Which stream serves which purpose, by stream *name* rather than by index or
   * id: a name survives reordering the list, and a role left pointing at a name
   * that no longer exists is a visible, correctable error rather than a
   * silently wrong stream.
   */
  roles: Record<StreamRole, string>;
  recording: CameraRecordingSettings;
  detect: CameraDetectSettings;
  /**
   * False when the server sent no `recordingEnabled` at all and the defaults
   * above were filled in. The page shows unknown rather than "off", since "the
   * node does not report this yet" is not a setting the user made.
   */
  settingsReported: boolean;
}

/**
 * The writable fields of a camera, in the model's shape. `camerasService.toWire`
 * flattens the two settings blocks and derives `sourceUrl` / `subStreamUrl` from
 * the streams `record` and `live` point at, so nothing here names a wire field
 * the server does not have.
 *
 * `password` is only ever sent when the user actually typed one: left out, the
 * server keeps whatever it has stored.
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
  streams: CameraStream[];
  roles: Record<StreamRole, string>;
  recording: CameraRecordingSettings;
  detect: CameraDetectSettings;
}
