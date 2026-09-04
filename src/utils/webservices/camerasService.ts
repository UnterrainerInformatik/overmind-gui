import { BaseService } from '@/utils/webservices/interfaces/BaseService'
import { singleton as axiosUtils } from '@/utils/axiosUtils'
import {
  Camera, CameraDetectSettings, CameraRecordingSettings, CameraStream, CameraWrite, StreamProbeResult, StreamRole
} from '@/utils/webservices/interfaces/Camera'
import { CameraNode, CameraNodeWrite } from '@/utils/webservices/interfaces/CameraNode'
import { ConnectionTestResult } from '@/utils/webservices/interfaces/ConnectionStatus'

/**
 * The camera registry: the cameras of the installation and the Frigate-hosting
 * nodes they live on (java-overmind-server, `/setup/cameras` and `/setup/nodes`).
 *
 * Two collections rather than one, so this composes a `BaseService` per
 * collection instead of extending it - the CRUD calls are exactly the house
 * ones, only the connection tests need an endpoint of their own.
 *
 * Written against `ai/draft-cameras-for-frontend.md` in java-overmind-server
 * (sections 2-5, deployed and verified 2026-09-01). Three places where this
 * service adapts rather than mirrors, all documented at the method:
 * the enums, which arrive uppercase, `subStreamUrl`, and the named streams.
 *
 * The streams, the role map, the recording and detect settings and the stream
 * probe are **not deployed**: the server still stores a camera as
 * `sourceUrl` + `subStreamUrl`. This service is the single seam - it derives
 * the streams from those URLs on the way in and writes the assignment back
 * onto them on the way out, so the page runs on the model while the wire stays
 * what the deployed server reads. See the change `camera-stream-settings`.
 */
export class CamerasService {
  private static instanceField: CamerasService

  protected server = 'uinf'
  private cameras = new BaseService('uinf', 'cameras')
  private nodes = new BaseService('uinf', 'nodes')

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new CamerasService())
    }
    return this.instanceField
  }

  /**
   * Every stored camera, enabled and disabled alike, in the order the pages show
   * them in. `sortOrder` is the server's ordering hint; the display name breaks
   * a tie so the order stays stable rather than following insertion order.
   */
  public async getCameras (): Promise<Camera[]> {
    const response = await this.cameras.getList()
    return this.sorted(response.entries || [])
  }

  /**
   * The cameras the live (Personen) page shows, in the configured order. The
   * flag is what makes "which camera appears where" an operational setting
   * rather than a constant in the sources, so the consumer pages ask for it
   * instead of naming a camera.
   */
  public async getCamerasForLivePage (): Promise<Camera[]> {
    return (await this.getCameras()).filter(camera => camera.enabled && camera.usedOnLivePage)
  }

  /** The cameras the events page covers, in the configured order. */
  public async getCamerasForEventsPage (): Promise<Camera[]> {
    return (await this.getCameras()).filter(camera => camera.enabled && camera.usedOnEventsPage)
  }

  public async getCamerasOfNode (nodeId: number): Promise<Camera[]> {
    const response = await this.cameras.getList({ additionalQueryParams: `nodeId=${nodeId}` })
    return this.sorted(response.entries || [])
  }

  public async getCamera (id: number): Promise<Camera> {
    return this.normalizeCamera(await this.cameras.getById(id))
  }

  public async createCamera (camera: CameraWrite): Promise<Camera> {
    return this.normalizeCamera(await this.cameras.post(() => this.toWire(camera)))
  }

  public async updateCamera (id: number, camera: CameraWrite): Promise<Camera> {
    return this.normalizeCamera(await this.cameras.put(id, () => this.toWire(camera)))
  }

  public async deleteCamera (id: number): Promise<any> {
    return this.cameras.del(id)
  }

  /**
   * Checks one camera on demand. A camera that cannot be reached is not an HTTP
   * error - the server answers `error` plus a reason and stores it as the
   * camera's new last-known status.
   */
  public async testCamera (id: number): Promise<ConnectionTestResult> {
    return this.toTestResult(await axiosUtils.postToPath(this.server, 'cameraTest', id, () => ({})))
  }

  public async getNodes (): Promise<CameraNode[]> {
    const response = await this.nodes.getList()
    const entries: any[] = response.entries || []
    return entries.map(node => this.normalizeNode(node)).sort((a, b) => a.name.localeCompare(b.name))
  }

  public async getNode (id: number): Promise<CameraNode> {
    return this.normalizeNode(await this.nodes.getById(id))
  }

  public async createNode (node: CameraNodeWrite): Promise<CameraNode> {
    return this.nodes.post(() => node)
  }

  public async updateNode (id: number, node: CameraNodeWrite): Promise<CameraNode> {
    return this.nodes.put(id, () => node)
  }

  /**
   * Deleting a node that still holds cameras is refused by the server with the
   * reason on the error - the page shows it and leaves everything in place.
   */
  public async deleteNode (id: number): Promise<any> {
    return this.nodes.del(id)
  }

  public async testNode (id: number): Promise<ConnectionTestResult> {
    return this.toTestResult(await axiosUtils.postToPath(this.server, 'nodeTest', id, () => ({})))
  }

  /**
   * Asks a node what a stream actually delivers. Addressed at the node rather
   * than at the camera because the setup assistant probes a camera that does
   * not exist yet - see `rest.ts`.
   *
   * A stream that cannot be read is not an HTTP error, same as the two test
   * endpoints: the answer carries a `reason` and comes back as a result, so a
   * caller shows it instead of catching it.
   */
  public async probeStream (nodeId: number, url: string, username?: string | null, password?: string | null): Promise<StreamProbeResult> {
    const response = await axiosUtils.postToPath(this.server, 'nodeStreamProbe', nodeId, () => {
      const payload: any = { url }
      if (username) {
        payload.username = username
      }
      // only ever sent when the caller actually has one to send: a stored
      // password is never read back, so the assistant is the only caller that
      // can supply it
      if (password) {
        payload.password = password
      }
      return payload
    })
    return this.toProbeResult(response)
  }

  private sorted (cameras: Camera[]): Camera[] {
    return cameras
      .map(camera => this.normalizeCamera(camera))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName))
  }

  /**
   * The server's enums are uppercase (`OK`, `PROVISIONED`) while the contract
   * document's payload examples show them lowercase. Rather than pick a side,
   * everything is lowered here once and every reader compares lowercase.
   */
  private lowered (value: any): any {
    return typeof value === 'string' ? value.toLowerCase() : null
  }

  /**
   * A camera as the pages want it. Besides the enums, this is where the
   * deployed two-URL schema meets this GUI's three: the server carries one
   * optional `subStreamUrl` - "lower-res stream for the live view" - which is
   * exactly this model's live source, so it is read as one. `liveSourceUrl`
   * wins as soon as the server carries it.
   */
  private normalizeCamera (camera: any): Camera {
    const liveSourceUrl = camera.liveSourceUrl || camera.subStreamUrl || null
    const detectSourceUrl = camera.detectSourceUrl || null
    const streams = Array.isArray(camera.streams) && camera.streams.length
      ? camera.streams.map((stream: any) => this.normalizeStream(stream))
      : this.derivedStreams(camera.sourceUrl, liveSourceUrl, detectSourceUrl)
    return Object.assign({}, camera, {
      liveSourceUrl,
      detectSourceUrl,
      hasPassword: !!camera.hasPassword,
      lastStatus: this.lowered(camera.lastStatus),
      // never absent in practice; defaulted so a camera cannot be marked
      // unprovisioned merely because the field was omitted
      provisioningState: this.lowered(camera.provisioningState) || 'provisioned',
      streams,
      roles: this.normalizeRoles(camera.roles, streams),
      recording: this.normalizeRecording(camera.recording),
      detect: this.normalizeDetect(camera.detect),
      // "the node does not report this yet" is not the same fact as "recording
      // is switched off", and the page has to say the first one differently
      settingsReported: !!(camera.recording || camera.detect)
    })
  }

  /**
   * The streams of a camera the server stores in the deployed two-URL schema,
   * derived from the URLs it does send:
   *
   *   sourceUrl only              -> main
   *   sourceUrl + live/subStream  -> main, sub
   *   all three                   -> main, sub, detect
   *
   * Every parameter comes out null and `settableFields` empty: nothing here was
   * measured, and a derived stream must not read as a probed one.
   */
  private derivedStreams (sourceUrl: string, liveSourceUrl: string | null, detectSourceUrl: string | null): CameraStream[] {
    const streams = [this.emptyStream('main', sourceUrl || '')]
    if (liveSourceUrl) {
      streams.push(this.emptyStream('sub', liveSourceUrl))
    }
    if (detectSourceUrl) {
      streams.push(this.emptyStream('detect', detectSourceUrl))
    }
    return streams
  }

  private emptyStream (name: string, url: string): CameraStream {
    return {
      name,
      url,
      width: null,
      height: null,
      fps: null,
      bitrateKbps: null,
      videoCodec: null,
      audioCodec: null,
      probedAt: null,
      settableFields: []
    }
  }

  /** A stream as sent, with the nullable parameters defaulted rather than left undefined. */
  private normalizeStream (stream: any): CameraStream {
    return Object.assign(this.emptyStream(stream.name, stream.url || ''), {
      width: this.orNull(stream.width),
      height: this.orNull(stream.height),
      fps: this.orNull(stream.fps),
      bitrateKbps: this.orNull(stream.bitrateKbps),
      videoCodec: stream.videoCodec || null,
      audioCodec: stream.audioCodec || null,
      probedAt: stream.probedAt || null,
      settableFields: Array.isArray(stream.settableFields) ? stream.settableFields : []
    })
  }

  /**
   * The role map, either as sent or derived from the streams: record on `main`,
   * live on the sub stream where there is one, detect on the detect stream and
   * otherwise on the live one. A role naming a stream the camera does not have
   * falls back to `main` rather than pointing nowhere.
   */
  private normalizeRoles (roles: any, streams: CameraStream[]): Record<StreamRole, string> {
    const names = streams.map(stream => stream.name)
    const main = names[0] || 'main'
    const sub = names.indexOf('sub') >= 0 ? 'sub' : main
    const detect = names.indexOf('detect') >= 0 ? 'detect' : sub
    const derived: Record<StreamRole, string> = { record: main, live: sub, detect }
    if (!roles) {
      return derived
    }
    const kept = (role: StreamRole) => (names.indexOf(roles[role]) >= 0 ? roles[role] : derived[role])
    return { live: kept('live'), detect: kept('detect'), record: kept('record') }
  }

  /** Recording as sent; absent means off, around events, retention unknown. */
  private normalizeRecording (recording: any): CameraRecordingSettings {
    return {
      enabled: !!(recording && recording.enabled),
      mode: recording && this.lowered(recording.mode) === 'continuous' ? 'continuous' : 'events',
      retentionDays: this.orNull(recording && recording.retentionDays)
    }
  }

  /** Detection as sent; absent means every parameter unknown and audio off. */
  private normalizeDetect (detect: any): CameraDetectSettings {
    return {
      width: this.orNull(detect && detect.width),
      height: this.orNull(detect && detect.height),
      fps: this.orNull(detect && detect.fps),
      audioEnabled: !!(detect && detect.audioEnabled),
      motionThreshold: this.orNull(detect && detect.motionThreshold)
    }
  }

  /** A number as sent, or null - so an omitted parameter never reads as a measured 0. */
  private orNull (value: any): number | null {
    return typeof value === 'number' && !isNaN(value) ? value : null
  }

  private normalizeNode (node: any): CameraNode {
    return Object.assign({}, node, {
      lastStatus: this.lowered(node.lastStatus),
      // absent until the server reports them; null is what the dialog renders
      // as unknown, so an omitted figure must not become a 0
      frigateVersion: node.frigateVersion || null,
      storageTotalBytes: this.orNull(node.storageTotalBytes),
      storageUsedBytes: this.orNull(node.storageUsedBytes)
    })
  }

  /**
   * The write payload. The live source is sent under `subStreamUrl` as well,
   * which is the only one of the three the deployed server knows - so the page
   * keeps working against it without giving up the three-source model. Harmless
   * once the server carries `liveSourceUrl`, since that one wins on read.
   */
  private toWire (camera: CameraWrite): object {
    const url = (role: StreamRole) => {
      const stream = (camera.streams || []).find(candidate => candidate.name === (camera.roles || {} as any)[role])
      return (stream && stream.url) || null
    }
    const sourceUrl = url('record') || camera.sourceUrl
    // A role served by the source stream is written as null rather than as a
    // copy of `sourceUrl`: the server already falls back that way, and writing
    // the copy would turn a camera that came in with no `subStreamUrl` into one
    // that has one merely by being opened and saved.
    const liveSourceUrl = url('live') === sourceUrl ? null : url('live')
    const detectUrl = url('detect')
    const detectSourceUrl = detectUrl === sourceUrl || detectUrl === liveSourceUrl ? null : detectUrl
    return Object.assign({}, camera, {
      sourceUrl,
      liveSourceUrl,
      detectSourceUrl,
      subStreamUrl: liveSourceUrl
    })
  }

  /**
   * `POST .../streamProbe` answers with the measured parameters, or with a
   * `reason` - the same house shape as the two test endpoints, so a stream that
   * cannot be read is a result rather than an exception.
   */
  private toProbeResult (response: any): StreamProbeResult {
    if (!response || response.reason || this.lowered(response.status) === 'error') {
      return { result: 'error', reason: (response && response.reason) || null, measured: null }
    }
    return {
      result: 'ok',
      reason: null,
      measured: {
        width: this.orNull(response.width),
        height: this.orNull(response.height),
        fps: this.orNull(response.fps),
        bitrateKbps: this.orNull(response.bitrateKbps),
        videoCodec: response.videoCodec || null,
        audioCodec: response.audioCodec || null,
        settableFields: Array.isArray(response.settableFields) ? response.settableFields : []
      }
    }
  }

  /**
   * `POST .../test` answers `{ status: "OK" }` or `{ status: "ERROR", reason }`
   * - `status`, not `result`, and uppercase. Anything that is not OK is treated
   * as a failure, so an unexpected value shows as one rather than as success.
   */
  private toTestResult (response: any): ConnectionTestResult {
    const status = this.lowered(response && (response.status || response.result))
    return {
      result: status === 'ok' ? 'ok' : 'error',
      reason: (response && response.reason) || null
    }
  }
}

export const singleton = CamerasService.getInstance()
