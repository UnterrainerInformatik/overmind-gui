import { BaseService } from '@/utils/webservices/interfaces/BaseService'

export class AppliancesService extends BaseService {
  private static instanceField: AppliancesService

  constructor () {
    super('uinf', 'appliances')
  }

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new AppliancesService())
    }
    return this.instanceField
  }

  public async initialize (id: number | string) {
    return this.axiosUtils.getList(this.server, 'initialize', 1, 0, `id=${id}`)
  }
}

export const singleton = AppliancesService.getInstance()
