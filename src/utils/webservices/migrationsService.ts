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

  public async retryAppliance (fieldAccessorKey: string, applianceId: number): Promise<any> {
    return axiosUtils.post(this.server, 'migrationsRetry', () => ({ fieldAccessorKey, applianceId }))
  }

  public async retryAllErrors (fieldAccessorKey: string): Promise<any> {
    return axiosUtils.post(this.server, 'migrationsRetryErrors', () => ({ fieldAccessorKey }))
  }
}

export const singleton = MigrationsService.getInstance()
