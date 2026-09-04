import { Camera, StreamRole } from '@/utils/webservices/interfaces/Camera'

/**
 * The camera facts that both the Kameras page and the node detail dialog put on
 * screen, kept in one place so the two never drift apart. Everything here is
 * translation-free on purpose - the caller owns the wording, this owns the
 * decision of what to say.
 */
export class CameraUtils {
  private static instanceField: CameraUtils

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new CameraUtils())
    }
    return this.instanceField
  }

  /**
   * Which stream serves which purpose. A camera whose three purposes all sit on
   * the same stream is collapsed to that one name: naming the same stream three
   * times says nothing, and the single-stream camera is the common case.
   */
  public assignment (camera: Camera): { single: string | null; roles: Record<StreamRole, string> } {
    const roles = camera.roles || ({} as Record<StreamRole, string>)
    const distinct = [roles.live, roles.detect, roles.record].filter((name, index, all) => name && all.indexOf(name) === index)
    return { single: distinct.length === 1 ? distinct[0] : null, roles }
  }

  /** A byte figure as GB with one decimal; null stays null so it can be shown as unknown. */
  public gigabytes (bytes: number | null): number | null {
    return bytes === null || bytes === undefined ? null : Math.round((bytes / 1024 / 1024 / 1024) * 10) / 10
  }
}

export const singleton = CameraUtils.getInstance()
