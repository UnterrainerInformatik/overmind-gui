
export default {

  parseConfig: function (element) {
    if (element.config) {
      try {
        element.config = JSON.parse(element.config)
      } catch (Error) {
        delete element.config
      }
    }
  },

  parseState: function (element) {
    if (element.state) {
      try {
        element.state = JSON.parse(element.state)
      } catch (Error) {
        delete element.state
      }
    }
  },

  getBatteryIcon: function (level) {
    if (level >= 75) {
      return 'battery_charging_full'
    }
    if (level >= 20) {
      return 'battery_full'
    }
    return 'battery_alert'
  },

  getBatteryColor: function (level) {
    if (level >= 75) {
      return 'green darken-' + this.getMagicNumber(level, 75, 25, 4)
    }
    if (level >= 20) {
      return 'teal darken-' + this.getMagicNumber(level, 20, 55, 4)
    }
    return 'red darken-' + this.getMagicNumber(level, 0, 19, 4)
  },

  getMagicNumber: function (value, startingValue, numberOfValuesInStep, numberOfSteps) {
    return Math.floor((value - startingValue) / (numberOfValuesInStep / (numberOfSteps - 0.0001)) + 1)
  },

  openInNewTab: function (address) {
    window.open(address, '_blank')
  },

  getIconFor: function (item) {
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
  },

  setTimeoutChain: function (functionArray, deltaMillis) {
    let dm = deltaMillis
    for (const func of functionArray) {
      setTimeout(func, dm)
      dm += deltaMillis
    }
  }

}
