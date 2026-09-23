import { singleton as axiosUtils } from '@/utils/axiosUtils'
import { singleton as dateUtils } from '@/utils/dateUtils'

/** Where a job's footage is kept - lowered here, see lowered(). */
export type StorageChoice = 'local' | 'central'

export type RecordingWindowState = 'active' | 'ended' | string

/**
 * One recording job. The server calls it a *window*, and so does this file; the
 * user is shown *Auftrag* / *job*. `endTime` is epoch seconds here. A window has
 * no start time - the server does not keep one.
 */
export interface RecordingWindow {
  id: number;
  cameraId: number;
  endTime: number | null;
  storageChoice: StorageChoice;
  state: RecordingWindowState;
}

/**
 * A camera's recording jobs: continuous recording until a chosen moment, with
 * the footage kept on the node or also copied into the central archive (openspec
 * change `camera-recording-jobs`).
 *
 * Unlike the camera and archive services when they were first written, this one
 * is built against a **known** contract: java-overmind-server's capability
 * `continuous-recording` (change `continuous-recording-alert-archive`), checked
 * against its source and against its live smoke test of 2026-09-10 on node
 * `haus`, where a 3-minute LOCAL window went ACTIVE and reverted itself on time.
 *
 * Accepted 2026-09-23 against the deployed server from this GUI: a short local
 * job on a real camera counted down on the Kameras page and was ended early,
 * and a short central job's range was found in the archive as "Aufzeichnung".
 *
 *   POST /cameras/{id}/continuousRecording
 *     body { endTime, storageChoice: LOCAL|CENTRAL } -> window
 *     404 unknown camera; 409 disabled camera or node, or an ACTIVE window
 *     already exists; 400 `endTime` absent or not in the future.
 *
 *   GET /cameras/{id}/continuousRecording
 *     -> { windows: [...] }, past and present
 *
 *   POST /cameras/{id}/continuousRecording/{windowId}/end
 *     -> the ended window
 *
 *   window: { id, cameraId, endTime, storageChoice: LOCAL|CENTRAL,
 *             state: ACTIVE|ENDED }
 *
 * `endTime` is overmind's `LocalDateTime` in UTC in both directions, enums are
 * uppercase on the wire, and every refusal carries `{ reason }`, which
 * axiosUtils hands on as `err.serverMessage`.
 *
 * A service of its own rather than a corner of `camerasService`: that one is
 * about camera setup under `/setup/cameras`, while these routes sit on the media
 * side, `/cameras/{id}/...`, next to events and the archive.
 */
export class RecordingJobsService {
  private static instanceField: RecordingJobsService

  protected server = 'uinf'

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new RecordingJobsService())
    }
    return this.instanceField
  }

  /** Every window of a camera, past and present. */
  public async getWindows (cameraId: number): Promise<RecordingWindow[]> {
    const response = await axiosUtils.getFromPath(this.server, 'cameraRecordingJobs', { id: cameraId })
    return this.windowsOf(response).map(window => this.toWindow(window))
  }

  /** Starts a job ending at `endEpochSeconds` and answers the new window. */
  public async start (cameraId: number, endEpochSeconds: number, storageChoice: StorageChoice): Promise<RecordingWindow> {
    const body = {
      endTime: dateUtils.epochSecondsToUtcLocalDateTime(endEpochSeconds),
      storageChoice: storageChoice.toUpperCase()
    }
    const response = await axiosUtils.postToPath(this.server, 'cameraRecordingJobs', cameraId, () => body)
    return this.toWindow(response)
  }

  /** Ends a running job now; the server restores the camera's prior recording settings. */
  public async end (cameraId: number, windowId: number): Promise<RecordingWindow> {
    const response = await axiosUtils.postToPath(
      this.server, 'cameraRecordingJobEnd', { id: cameraId, windowId }, () => ({}))
    return this.toWindow(response)
  }

  private toWindow (window: any): RecordingWindow {
    const w = window || {}
    return {
      id: w.id,
      cameraId: w.cameraId,
      endTime: dateUtils.utcLocalDateTimeToEpochSeconds(w.endTime),
      storageChoice: this.lowered(w.storageChoice) || 'local',
      state: this.lowered(w.state) || 'ended'
    }
  }

  /**
   * The server's enums are uppercase while every reader here compares
   * lowercase, so they are lowered once at this seam, as archiveService does.
   */
  private lowered (value: any): any {
    return typeof value === 'string' ? value.toLowerCase() : null
  }

  /** The windows envelope, tolerating a bare array. */
  private windowsOf (response: any): any[] {
    if (Array.isArray(response)) {
      return response
    }
    return (response && response.windows) || []
  }
}

export const singleton = RecordingJobsService.getInstance()
