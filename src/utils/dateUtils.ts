class DateUtils {
  private static instanceField: DateUtils

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new DateUtils())
    }
    return this.instanceField
  }

  public static readonly unitsInMinutes = [
    1 * 60 * 24 * 365,
    1 * 60 * 24 * 30,
    1 * 60 * 24 * 7,
    1 * 60 * 24,
    1 * 60,
    1
  ]

  /**
  * Returns the week number for this date.
  * https://stackoverflow.com/questions/9045868/javascript-date-getweek
  * @param  {Date} date
  * @param  {number} [dowOffset] — The day of week the week "starts" on for your locale - it can be from `0` to `6`.
  * For 'USA, Sunday' `dowOffset` is `0`. If `dowOffset` is 1 (Monday - default), the week returned is the ISO 8601 week number.
  * @return {number}
  */
  public getWeek (date, dowOffset = 1) {
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
  }

  public isoToDateLong (d, locale) {
    if (!d) {
      return ''
    }
    return this.dateToDateLong(new Date(d + 'Z'), locale)
  }

  public dateToDateLong (d, locale) {
    if (!d) {
      return ''
    }
    return d.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
  }

  public isoToDateLongPadded (d, locale) {
    if (!d) {
      return ''
    }
    return this.dateToDateLongPadded(new Date(d + 'Z'), locale)
  }

  public dateToDateLongPadded (d, locale) {
    if (!d) {
      return ''
    }
    return d.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  public isoToDate (d, locale) {
    if (!d) {
      return ''
    }
    return this.dateToDate(new Date(d + 'Z'), locale)
  }

  public dateToDate (d, locale) {
    if (!d) {
      return ''
    }
    return d.toLocaleDateString(locale)
  }

  public isoToDatePadded (d, locale) {
    if (!d) {
      return ''
    }
    return this.dateToDatePadded(new Date(d + 'Z'), locale)
  }

  public dateToDatePadded (d, locale) {
    if (!d) {
      return ''
    }
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  public isoToTime (d, locale) {
    if (!d) {
      return ''
    }
    return this.dateToTime(new Date(d + 'Z'), locale)
  }

  public dateToTime (d, locale) {
    if (!d) {
      return ''
    }
    return d.toLocaleTimeString(locale)
  }

  public isoToShortTime (d, locale) {
    if (!d) {
      return ''
    }
    return this.dateToShortTime(new Date(d + 'Z'), locale)
  }

  public dateToShortTime (d, locale) {
    if (!d) {
      return ''
    }
    return d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  public isoToLongTime (d, locale) {
    if (!d) {
      return ''
    }
    return this.dateToLongTime(new Date(d + 'Z'), locale)
  }

  public dateToLongTime (d, locale) {
    if (!d) {
      return ''
    }
    return d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  public isoToShortDateTime (d, locale) {
    if (!d) {
      return ''
    }
    return this.isoToDatePadded(d, locale) + ' ' + this.isoToShortTime(d, locale)
  }

  public isoToShortDateLongTime (d, locale) {
    if (!d) {
      return ''
    }
    return this.isoToDatePadded(d, locale) + ' ' + this.isoToLongTime(d, locale)
  }

  public dateToShortDateTime (d, locale) {
    if (!d) {
      return ''
    }
    return this.dateToDatePadded(d, locale) + ' ' + this.dateToShortTime(d, locale)
  }

  public dateToShortDateLongTime (d, locale) {
    if (!d) {
      return ''
    }
    return this.dateToDatePadded(d, locale) + ' ' + this.dateToLongTime(d, locale)
  }

  public isSameDay (d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
  }

  public getUtcOf (d) {
    return new Date(d.toUTCString().slice(0, -4))
  }

  public getUtc () {
    return this.getUtcOf(new Date())
  }

  public pad (d) {
    return ('00' + d).slice(-2)
  }

  public getIsoDateOf (s) {
    return `${s.getFullYear()}-${this.pad(s.getMonth() + 1)}-${this.pad(s.getDate())}`
  }

  public getIsoTimeOf (s) {
    return `${('00' + s.getHours()).slice(-2)}:${('00' + s.getMinutes()).slice(-2)}`
  }

  public roundTimeToQuater (time, down = true) {
    const roundTo = 15 // minutes
    const roundDownTime = roundTo * 60 * 1000

    return down
      ? time - time % roundDownTime
      : time + (roundDownTime - (time % roundDownTime))
  }
}

export const singleton = DateUtils.getInstance()
