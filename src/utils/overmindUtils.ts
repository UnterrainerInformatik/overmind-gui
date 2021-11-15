
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
      case 'DIMMER':
      case 'BULB_RGB':
        return 'lightbulb'
      case 'DEBUGGER':
        return 'bug_report'
      case 'GROUP_SERIAL':
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
      case 'RELAY_DUAL':
      case 'RELAY':
        return 'power'
      case 'STATE_CHECKER':
        return 'check_circle_outline'
      default:
        return 'adb'
    }
  }

  public opened (contact) {
    return contact && contact.state && contact.state.closures && contact.state.closures[0] && contact.state.closures[0].open && contact.state.closures[0].tilt < 2
  }

  public tilted (contact) {
    return contact && contact.state && contact.state.closures && contact.state.closures[0] && contact.state.closures[0].open && contact.state.closures[0].tilt >= 2
  }

  public closed (contact) {
    return !contact || !contact.state || !contact.state.closures || !contact.state.closures[0] || !contact.state.closures[0].open
  }

  public getOpenColorFor (contact) {
    if (this.opened(contact)) {
      return 'error'
    }
    if (this.tilted(contact)) {
      return 'warning'
    }
    if (this.closed(contact)) {
      return 'success'
    }
  }

  public getLuminosityLevelFor (contact) {
    if (!contact || !contact.state || !contact.state.luminosities || !contact.state.luminosities[0] || !contact.state.luminosities[0].luminosityLevel) {
      return 'none'
    }
    return contact.state.luminosities[0].luminosityLevel
  }

  public getLuminosityIconFor (contact) {
    switch (this.getLuminosityLevelFor(contact)) {
      case 'none':
        return ''
      case 'bright':
        return 'brightness_1'
      case 'twilight':
        return 'brightness_2'
      case 'dark':
        return 'brightness_3'
    }
    return ''
  }

  public getOpenIconFor (contact) {
    if (this.opened(contact)) {
      return 'brightness_high'
    }
    if (this.tilted(contact)) {
      return 'brightness_medium'
    }
    if (this.closed(contact)) {
      return 'brightness_low'
    }
    return ''
  }

  public getOpenStateFor (contact) {
    if (this.opened(contact)) {
      return 'opened'
    }
    if (this.tilted(contact)) {
      return 'tilted'
    }
    if (this.closed(contact)) {
      return 'closed'
    }
    return ''
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
