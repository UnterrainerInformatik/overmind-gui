
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

  public addOnOffStateTo (item, index) {
    if (item === undefined) {
      return
    }

    switch (item.type) {
      case 'PLUG':
      case 'RELAY':
      case 'DIMMER':
      case 'BULB_RGB':
        if (!item || !item.state || !item.state.relays || !item.state.relays[0] || !item.state.relays[0].state) {
          item.onOffState = 'error'
          return
        }
        if (item.state.relays[0].state.toLowerCase() === 'on') {
          item.onOffState = 'on'
          return
        }
        item.onOffState = 'off'
        return
      case 'MOTION_SENSOR':
        if (!item || !item.state || !item.state.motions || !item.state.motions[0] || item.state.motions[0].motion === undefined) {
          console.log(item)
          item.onOffState = 'error'
          return
        }
        if (item.state.motions[0].motion) {
          item.onOffState = 'on'
          return
        }
        item.onOffState = 'off'
        return
      case 'RELAY_DUAL':
        if (!item || !item.state || !item.state.relays || !item.state.relays[0] || !item.state.relays[1] || !item.state.relays[0].state || !item.state.relays[1].state) {
          item.onOffState = 'error'
          return
        }
        if (item.state.relays[index].state.toLowerCase() === 'on') {
          if (item.onOffState === undefined) {
            item.onOffState = []
          }
          item.onOffState[index] = 'on'
          return
        }
        if (item.state.relays[index].state.toLowerCase() !== 'on') {
          if (item.onOffState === undefined) {
            item.onOffState = []
          }
          item.onOffState[index] = 'off'
          return
        }
        item.onOffState = 'error'
        return
    }
    item.onOffState = 'none'
  }

  public getPowerOf (item, index) {
    if (item === undefined) {
      return
    }

    let i = 0
    if (item.type === 'RELAY_DUAL') {
      i = index
    }
    if (!item || !item.state || !item.state.relays || !item.state.relays[i] || !item.state.relays[i].state || item.state.relays[i].power === undefined) {
      return undefined
    }
    return Number.parseFloat(item.state.relays[i].power)
  }

  public formatPower (p) {
    if (p < 1) {
      return '<1 W'
    }
    if (p >= 1000) {
      const sub = Math.round(p / 1000)
      return Math.floor(p / 1000) + '.' + sub + ' kW'
    }
    return Math.round(p) + ' W'
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
      return 'on'
    }
    if (this.tilted(contact)) {
      return 'warning'
    }
    if (this.closed(contact)) {
      return 'off'
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
