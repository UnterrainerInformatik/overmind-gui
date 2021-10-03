import { singleton as axiosUtils } from '@/utils/axiosUtils'

export class SystemService {
  private static instanceField: SystemService

  protected axiosUtils = axiosUtils
  protected server = 'uinf'

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new SystemService())
    }
    return this.instanceField
  }

  public async reloadAppliances () {
    return this.axiosUtils.getResponse(this.server, 'reloadAppliances')
  }
}

export const singleton = SystemService.getInstance()
