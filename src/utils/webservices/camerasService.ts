import { BaseService } from '@/utils/webservices/interfaces/BaseService'
import { singleton as axiosUtils } from '@/utils/axiosUtils'
import { Camera, CameraWrite } from '@/utils/webservices/interfaces/Camera'
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
 * (sections 2-5, deployed and verified 2026-09-01). Two places where this
 * service adapts rather than mirrors, both documented at the method:
 * the enums, which arrive uppercase, and `subStreamUrl`.
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
    return this.cameras.post(() => this.toWire(camera))
  }

  public async updateCamera (id: number, camera: CameraWrite): Promise<Camera> {
    return this.cameras.put(id, () => this.toWire(camera))
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
    return Object.assign({}, camera, {
      liveSourceUrl: camera.liveSourceUrl || camera.subStreamUrl || null,
      detectSourceUrl: camera.detectSourceUrl || null,
      hasPassword: !!camera.hasPassword,
      lastStatus: this.lowered(camera.lastStatus),
      // never absent in practice; defaulted so a camera cannot be marked
      // unprovisioned merely because the field was omitted
      provisioningState: this.lowered(camera.provisioningState) || 'provisioned'
    })
  }

  private normalizeNode (node: any): CameraNode {
    return Object.assign({}, node, { lastStatus: this.lowered(node.lastStatus) })
  }

  /**
   * The write payload. The live source is sent under `subStreamUrl` as well,
   * which is the only one of the three the deployed server knows - so the page
   * keeps working against it without giving up the three-source model. Harmless
   * once the server carries `liveSourceUrl`, since that one wins on read.
   */
  private toWire (camera: CameraWrite): object {
    return Object.assign({}, camera, { subStreamUrl: camera.liveSourceUrl || null })
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
