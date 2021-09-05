const unitsInMinutes = [
  1 * 60 * 24 * 365,
  1 * 60 * 24 * 30,
  1 * 60 * 24 * 7,
  1 * 60 * 24,
  1 * 60,
  1
]

export default {
  /**
  * Returns the week number for this date.
  * https://stackoverflow.com/questions/9045868/javascript-date-getweek
  * @param  {Date} date
  * @param  {number} [dowOffset] — The day of week the week "starts" on for your locale - it can be from `0` to `6`.
  * For 'USA, Sunday' `dowOffset` is `0`. If `dowOffset` is 1 (Monday - default), the week returned is the ISO 8601 week number.
  * @return {number}
  */
  getWeek: function (date, dowOffset = 1) {
    /* getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */
    const newYear = new Date(date.getFullYear(), 0, 1)
    let day = newYear.getDay() - dowOffset // the day of week the year begins on
    day = (day >= 0 ? day : day + 7)
    const daynum = Math.floor((date.getTime() - newYear.getTime() -
      (date.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1
    // if the year starts before the middle of a week
    if (day < 4) {
      const weeknum = Math.floor((daynum + day - 1) / 7) + 1
      if (weeknum > 52) {
        const nYear = new Date(date.getFullYear() + 1, 0, 1)
        let nday = nYear.getDay() - dowOffset
        nday = nday >= 0 ? nday : nday + 7
        /* if the next year starts before the middle of
          the week, it is week #1 of that year */
        return nday < 4 ? 1 : 53
      }
      return weeknum
    } else {
      return Math.floor((daynum + day - 1) / 7)
    }
  },

  isoToDateLong: function (d, locale) {
    return new Date(d + 'Z').toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
  },

  isoToDateLongPadded: function (d, locale) {
    return new Date(d + 'Z').toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  },

  isoToDate: function (d, locale) {
    return new Date(d + 'Z').toLocaleDateString(locale)
  },

  isoToDatePadded: function (d, locale) {
    return new Date(d + 'Z').toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  },

  isoToTime: function (d, locale) {
    return new Date(d + 'Z').toLocaleTimeString(locale)
  },

  getUtcOf: function (d) {
    return new Date(d.toUTCString().slice(0, -4))
  },

  getUtc: function () {
    return this.getUtcOf(new Date())
  },

  pad: function (d) {
    return ('00' + d).slice(-2)
  },

  getIsoDateOf: function (s) {
    return `${s.getFullYear()}-${this.pad(s.getMonth() + 1)}-${this.pad(s.getDate())}`
  },

  getIsoTimeOf: function (s) {
    return `${('00' + s.getHours()).slice(-2)}:${('00' + s.getMinutes()).slice(-2)}`
  },

  roundTimeToQuater: function (time, down = true) {
    const roundTo = 15 // minutes
    const roundDownTime = roundTo * 60 * 1000

    return down
      ? time - time % roundDownTime
      : time + (roundDownTime - (time % roundDownTime))
  }
}
