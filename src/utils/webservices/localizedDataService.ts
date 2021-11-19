import { BaseService } from '@/utils/webservices/interfaces/BaseService'

export class LocalizedDataService extends BaseService {
  private static instanceField: LocalizedDataService

  constructor () {
    super('uinf', 'localizedData')
  }

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new LocalizedDataService())
    }
    return this.instanceField
  }

  public async getByIdentifier (identifier: string) {
    return this.axiosUtils.getList(this.server, 'localizedData', 1, 0, `identifier=${identifier}`).then((response) => {
      if (response.entries.length === 0) {
        return null
      }
      return response.entries[0]
    })
  }
}

export const singleton = LocalizedDataService.getInstance()
