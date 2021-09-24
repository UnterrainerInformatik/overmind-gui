import { BaseService } from '@/utils/webservices/interfaces/BaseService'

export class GuiSwitchesService extends BaseService {
  private static instanceField: GuiSwitchesService

  constructor () {
    super('uinf', 'guiSwitches')
  }

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new GuiSwitchesService())
    }
    return this.instanceField
  }
}

export const singleton = GuiSwitchesService.getInstance()
