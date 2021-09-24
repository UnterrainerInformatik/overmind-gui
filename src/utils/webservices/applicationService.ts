import { singleton as axiosUtils } from '@/utils/axiosUtils'

export class EventService {
  private static instanceField: EventService

  protected server = 'uinf'
  protected axiosUtils = axiosUtils

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new EventService())
    }
    return this.instanceField
  }

  public async getVersion () {
    return axiosUtils.getResponse(this.server, 'application.version')
  }
}

export const singleton = EventService.getInstance()
