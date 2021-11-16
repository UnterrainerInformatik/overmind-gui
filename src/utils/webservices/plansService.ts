import { BaseService } from '@/utils/webservices/interfaces/BaseService'

export class PlansService extends BaseService {
  private static instanceField: PlansService

  constructor () {
    super('uinf', 'plans')
  }

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new PlansService())
    }
    return this.instanceField
  }

  public async execute (dataProvider: () => object): Promise<any> {
    return this.axiosUtils.post(this.server, 'execute', dataProvider)
  }

  public async getOrderedPlans (size?: number, offset?: number, additionalQueryParams?: string, enabledOnly?: boolean) {
    return this.axiosUtils.getList(this.server, 'orderedPlans', size, offset, additionalQueryParams + (enabledOnly ? '&enabled=true' : ''))
  }

  public async isPlanEnabled (id: number) {
    return this.getById(id).then((response) => {
      return response && response.enabled
    })
  }
}

export const singleton = PlansService.getInstance()
