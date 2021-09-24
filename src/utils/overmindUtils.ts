
class OvermindUtils {
  private static instanceField: OvermindUtils

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new OvermindUtils())
    }
    return this.instanceField
  }

  public parseConfig (element) {
    if (element.config) {
      try {
        element.config = JSON.parse(element.config)
      } catch (Error) {
        delete element.config
      }
    }
  }

  public parseState (element) {
    if (element.state) {
      try {
        element.state = JSON.parse(element.state)
      } catch (Error) {
        delete element.state
      }
    }
  }

  public openInNewTab (address) {
    window.open(address, '_blank')
  }

  public getIconFor (item) {
    switch (item.type) {
      case 'SHUTTERS':
        return 'camera'
      case 'LIGHTS':
        return 'lightbulb'
      case 'DEBUGGER':
        return 'bug_report'
      case 'GROUP_PARALLEL':
        return 'groups'
      case 'PLAN_MANIPULATOR':
        return 'adb'
      case 'SWITCH':
        return 'toggle_on'
      case 'CONTACT_SENSOR':
        return 'meeting_room'
      case 'MOTION_SENSOR':
        return 'vibration'
      case 'PLUG':
        return 'power'
      default:
        return 'adb'
    }
  }

  public setTimeoutChain (functionArray, deltaMillis) {
    let dm = deltaMillis
    for (const func of functionArray) {
      setTimeout(func, dm)
      dm += deltaMillis
    }
  }
}

export const singleton = OvermindUtils.getInstance()
