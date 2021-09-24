import { singleton as axiosUtils } from '@/utils/axiosUtils'

export class EventsService {
  private static instanceField: EventsService

  protected server = 'uinf'
  protected axiosUtils = axiosUtils

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new EventsService())
    }
    return this.instanceField
  }

  public async trigger (dataProvider: () => object): Promise<any> {
    return this.axiosUtils.post(this.server, 'triggerEvent', dataProvider)
  }
}

export const singleton = EventsService.getInstance()
