import { singleton as jsUtils } from '@/utils/jsUtils'

class OvermindUtils {
  private static instanceField: OvermindUtils

  // The next variable is just here to see the colors live...
  public tempRawColors = ['rgba(0, 0, 200, 0.6)', 'rgba(255, 255, 255, 0.6)', 'rgba(144, 202, 249, 0.6)', 'rgba(38, 166, 154, 0.6)', 'rgba(0, 255, 0, 0.6)', 'rgba(212, 225, 70, 0.6)', 'rgba(255, 100, 50, 0.6)', 'rgba(255, 255, 255, 0.6)', 'rgba(200, 0, 0, 0.6)']
  public tempRawColorsLerpable = [[0, 0, 200, 0.6], [255, 255, 255, 0.6], [144, 202, 249, 0.6], [38, 166, 154, 0.6], [0, 255, 0, 0.6], [255, 225, 70, 0.6], [255, 100, 50, 0.6], [255, 255, 255, 0.6], [200, 0, 0, 0.6]]
  // Boundaries are oriented like in between the colors:
  // c1 --<b1>-- c2 --<b2>-- c3
  private tempBoundaries = [-10, 0, 10, 22, 24, 26, 30, 36]

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new OvermindUtils())
    }
    return this.instanceField
  }

  public calculateTemperatureIndex (temperature) {
    const temp = parseFloat(temperature)
    for (let i = 0; i < this.tempBoundaries.length; i++) {
      if (temp < this.tempBoundaries[i]) {
        return i
      }
    }
    return this.tempBoundaries.length + 1
  }

  public getTempDescriptionFor (temp) {
    const n = this.calculateTemperatureIndex(temp)
    let p = n - 1
    if (p < 0) {
      p = 0
    }
    return `${this.tempBoundaries[p]} < t < ${this.tempBoundaries[n]}`
  }

  public getTempColorFor (temperature) {
    const temp = Number.parseFloat(temperature)
    // console.log({ temp })
    const n = this.calculateTemperatureIndex(temp)
    let i = n - 1
    if (i < 0) {
      i = 0
    }
    // console.log({ i }, { n })
    const prevTemp = this.tempBoundaries[i]
    const nextTemp = this.tempBoundaries[n]
    const p = (temp - prevTemp) / (nextTemp - prevTemp)
    // console.log({ prevTemp }, { nextTemp }, { p })
    const col1 = this.tempRawColorsLerpable[i]
    const col2 = this.tempRawColorsLerpable[n]
    return this.lerpColorArrayToRgba(col1, col2, p)
  }

  public lerpColorArray (from, to, p) {
    return [
      Math.round(jsUtils.lerp(from[0], to[0], p)),
      Math.round(jsUtils.lerp(from[1], to[1], p)),
      Math.round(jsUtils.lerp(from[2], to[2], p)),
      jsUtils.lerp(from[3], to[3], p)
    ]
  }

  public colorArrayToRgba (c) {
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`
  }

  public lerpColorArrayToRgba (from, to, p) {
    return this.colorArrayToRgba(this.lerpColorArray(from, to, p))
  }

  public getBatteryIcon (level) {
    if (level >= 75) {
      return 'battery_charging_full'
    }
    if (level >= 20) {
      return 'battery_full'
    }
    return 'battery_alert'
  }

  public getBatteryColor (level) {
    if (level >= 75) {
      return 'green darken-' + this.getMagicNumber(level, 75, 25, 4)
    }
    if (level >= 20) {
      return 'teal darken-' + this.getMagicNumber(level, 20, 55, 4)
    }
    return 'red darken-' + this.getMagicNumber(level, 0, 19, 4)
  }

  public getMagicNumber (value, startingValue, numberOfValuesInStep, numberOfSteps) {
    return Math.floor((value - startingValue) / (numberOfValuesInStep / (numberOfSteps - 0.0001)) + 1)
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
        return 'emoji_objects'
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
        return 'track_changes'
      case 'PLUG':
        return 'power'
      case 'RELAY_DUAL':
      case 'RELAY':
        return 'outlet'
      case 'HT':
        return 'thermostat'
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

    if (!item.lastTimeOnline || Math.abs(new Date().getTime() - new Date(item.lastTimeOnline).getTime()) / (60 * 60 * 1000) > 24) {
      item.onOffState = 'error'
      return
    }

    switch (item.type) {
      case 'PLUG':
      case 'RELAY':
      case 'DIMMER':
      case 'BULB_RGB':
        if (!item || !item.state || !item.state.relays || !item.state.relays[0] || !item.state.relays[0].state) {
          if (item && item.state && item.iconPos1) {
            return item.state[item.iconPos1] > 0
          }
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
          item.onOffState = 'error'
          return
        }
        if (item.state.motions[0].motion) {
          item.onOffState = 'on'
          return
        }
        item.onOffState = 'off'
        return
      case 'HT':
        item.onOffState = 'on'
        item.colorPalette = () => {
          if (item && item.state && item.state.temperatures && item.state.temperatures[0] && item.state.temperatures[0].temperature) {
            return this.getTempColorFor(item.state.temperatures[0].temperature)
          }
          return 'rgba(160, 160, 160, 0.6)'
        }
        return
      case 'CONTACT_SENSOR':
        if (!item || !item.state || !item.state.closures || !item.state.closures[0] || item.state.closures[0].open === undefined) {
          item.onOffState = 'error'
          return
        }
        if (this.tilted(item)) {
          item.onOffState = 'middle'
          return
        }
        if (this.opened(item)) {
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

  public getTemperature (item) {
    if (item === undefined) {
      return
    }

    if (!item || !item.state || !item.state.temperatures || !item.state.temperatures[0] || !item.state.temperatures[0].temperature) {
      return undefined
    }
    return Number.parseFloat(item.state.temperatures[0].temperature)
  }

  public getHumidity (item) {
    if (item === undefined) {
      return
    }

    if (!item || !item.state || !item.state.humidities || !item.state.humidities[0] || !item.state.humidities[0].humidity) {
      return undefined
    }
    return Number.parseFloat(item.state.humidities[0].humidity)
  }

  public getPowerOf (item, index, negate) {
    if (item === undefined) {
      return
    }

    let i = 0
    let single = false
    if (index) {
      i = index
      single = true
    }
    if (!item || !item.state || !item.state.relays) {
      if (item && item.state && item.iconPos1) {
        return item.state[item.iconPos1]
      }
      return undefined
    }
    let r = 0
    while (item.state.relays[i] && item.state.relays[i].power !== undefined) {
      r += Number.parseFloat(item.state.relays[i].power)
      if (single) {
        break
      }
      i++
    }
    return negate ? -r : r
  }

  public formatPower (value: number, cap: boolean): string {
    if (value < 0) {
      return '-' + this.formatPower(-value, cap)
    }

    if (value < 1) {
      return cap ? '1 W' : '0 W'
    }

    const units = ['W', 'kW', 'MW', 'GW', 'TW']
    let power = 0
    while (value >= 1000 && power < units.length - 1) {
      value /= 1000
      power++
    }

    const formattedValue = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, '')
    return `${formattedValue} ${units[power]}`
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
      return 'warning'
    }
    if (this.tilted(contact)) {
      return 'on'
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
