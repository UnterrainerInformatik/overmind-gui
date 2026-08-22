import { singleton as axiosUtils } from '@/utils/axiosUtils'

export class MigrationsService {
  private static instanceField: MigrationsService

  protected server = 'uinf'

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new MigrationsService())
    }
    return this.instanceField
  }

  public async getStatus (): Promise<any> {
    return axiosUtils.getList(this.server, 'migrations')
  }
}

export const singleton = MigrationsService.getInstance()
