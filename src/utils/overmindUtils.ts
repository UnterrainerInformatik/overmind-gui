import { singleton as jsUtils } from '@/utils/jsUtils'

class OvermindUtils {
  private static instanceField: OvermindUtils

  public tempColors = ['white', 'blue lighten-5', 'blue lighten-4', 'blue lighten-3', 'teal lighten-3', 'teal lighten-1', 'green lighten-2', 'lime lighten-1', 'amber lighten-2', 'orange lighten-2', 'orange', 'white'];
  public tempRawColors = ['rgba(255, 255, 255, 0.6)', 'rgba(144, 202, 249, 0.6)', 'rgba(38, 166, 154, 0.6)', 'rgba(0, 255, 0, 0.6)', 'rgba(212, 225, 70, 0.6)', 'rgba(255, 100, 50, 0.6)', 'rgba(255, 255, 255, 0.6)']
  public tempRawColorsLerpable = [[255, 255, 255, 0.6], [144, 202, 249, 0.6], [38, 166, 154, 0.6], [0, 255, 0, 0.6], [255, 225, 70, 0.6], [255, 100, 50, 0.6], [255, 255, 255, 0.6]]
  public tempBoundariesInside = [-5, 10, 22, 24, 26, 28, 33]
  public tempBoundaries = [-39, -26, -13, 0, 6, 14, 20, 26, 32, 38, 40]
  public tempDescriptions = ['t < -39', '-39 < t < -26', '-26 < t < -13', '-13 < t < 0', '0 < t < 6', '6 < t < 14', '14 < t < 20', '20 < t < 26', '26 < t < 32', '32 < t < 38', '38 < t'];

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new OvermindUtils())
    }
    return this.instanceField
  }

  public getLerpedTempColorFor (temp) {
    // console.log({ temp })
    const n = this.calculateTemperatureIndex(temp, this.tempBoundariesInside)
    let i = n - 1
    if (i < 0) {
      i = 0
    }
    // console.log({ i }, { n })
    const prevTemp = this.tempBoundariesInside[i]
    const nextTemp = this.tempBoundariesInside[n]
    const p = (temp - prevTemp) / (nextTemp - prevTemp)
    // console.log({ prevTemp }, { nextTemp }, { p })
    const col1 = this.tempRawColorsLerpable[i]
    const col2 = this.tempRawColorsLerpable[n]
    const r = Math.round(jsUtils.lerp(col1[0], col2[0], p))
    const g = Math.round(jsUtils.lerp(col1[1], col2[1], p))
    const b = Math.round(jsUtils.lerp(col1[2], col2[2], p))
    const a = jsUtils.lerp(col1[3], col2[3], p)
    // console.log({ r }, { g }, { b }, { a })
    const result = `rgba(${r}, ${g}, ${b}, ${a})`
    return result
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

    if (!item.lastTimeOnline || Math.abs(new Date().getTime() - new Date(item.lastTimeOnline).getTime()) / (60 * 60 * 1000) > 15) {
      item.onOffState = 'error'
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
            return this.getLerpedTempColorFor(item.state.temperatures[0].temperature)
          }
          return 'rgba(60, 255, 255, 0.6)'
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

  public calculateTemperatureIndex (temperature, tempBoundaries) {
    const temp = parseFloat(temperature)
    for (let i = 0; i < tempBoundaries.length; i++) {
      if (temp < tempBoundaries[i]) {
        return i
      }
    }
    return tempBoundaries.length + 1
  }
}

export const singleton = OvermindUtils.getInstance()
