import { BaseService } from '@/utils/webservices/interfaces/BaseService'

export class SunRiseSetService extends BaseService {
  private static instanceField: SunRiseSetService

  constructor () {
    super('uinf', 'sunRiseSet')
  }

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new SunRiseSetService())
    }
    return this.instanceField
  }

  public async getRiseSet (lat: number, lng: number, dateTimeUtc: Date) {
    return this.axiosUtils.getResponse(this.server, 'sunRiseSet', `lat=${lat}&lng=${lng}&dateTimeUtc=${dateTimeUtc.toISOString()}`)
  }
}

export const singleton = SunRiseSetService.getInstance()
