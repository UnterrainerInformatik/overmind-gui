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

  public async reboot (id: number | string) {
    return this.axiosUtils.getList(this.server, 'reboot', 1, 0, `id=${id}`)
  }

  public async turnOn (id: number | string, actorPath: string) {
    return this.axiosUtils.post(this.server, 'execute', () => {
      return {
        applianceId: id,
        actorPath: actorPath,
        commands: [
          {
            name: 'on'
          }
        ]
      }
    })
  }

  public async turnOff (id: number | string, actorPath: string) {
    return this.axiosUtils.post(this.server, 'execute', () => {
      return {
        applianceId: id,
        actorPath: actorPath,
        commands: [
          {
            name: 'off'
          }
        ]
      }
    })
  }

  public async setBrightness (id: number | string, actorPath: string, value: number) {
    return this.axiosUtils.post(this.server, 'execute', () => {
      return {
        applianceId: id,
        actorPath: actorPath,
        commands: [
          {
            name: 'brightness',
            params: [value]
          }
        ]
      }
    })
  }

  public async setColor (id: number | string, actorPath: string, r: number, g: number, b: number, w: number, a: number) {
    return this.axiosUtils.post(this.server, 'execute', () => {
      return {
        applianceId: id,
        actorPath: actorPath,
        commands: [
          {
            name: 'setRgb',
            params: [r, g, b, w, a]
          }
        ]
      }
    })
  }

  public async setWhite (id: number | string, actorPath: string, brightness: number, temp: number) {
    return this.axiosUtils.post(this.server, 'execute', () => {
      return {
        applianceId: id,
        actorPath: actorPath,
        commands: [
          {
            name: 'setWhite',
            params: [brightness, temp]
          }
        ]
      }
    })
  }
}

export const singleton = AppliancesService.getInstance()
