import { BaseService } from '@/utils/webservices/interfaces/BaseService'

export class GuiWindowContactsService extends BaseService {
  private static instanceField: GuiWindowContactsService

  constructor () {
    super('uinf', 'guiWindowContacts')
  }

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new GuiWindowContactsService())
    }
    return this.instanceField
  }
}

export const singleton = GuiWindowContactsService.getInstance()
