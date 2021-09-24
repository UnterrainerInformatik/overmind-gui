
class JsUtils {
  private static instanceField: JsUtils

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new JsUtils())
    }
    return this.instanceField
  }

  public groupBy (inputArray, key) {
    return inputArray.reduce((accumulator, element) => {
      const v = key instanceof Function ? key(element) : element[key]
      const acc = (accumulator[v] = accumulator[v] || [])
      acc.push(element)
      return accumulator
    }, {})
  }

  /**
   * Add item, if not present in array, remove from array otherwise.
   * @param item the item to check for and to add/remove
   * @param array the array the item is to be added or removed
   */
  public toggleItem (item, array) {
    const index = array.indexOf(item)
    if (index === -1) {
      array.push(item)
    } else {
      array.splice(index, 1)
    }
  }

  public removeItem (item, array) {
    const index = array.indexOf(item)
    if (index !== -1) {
      array.splice(index, 1)
    }
  }

  public containsItem (item, array) {
    return array.indexOf(item) !== -1
  }

  /**
   * Returns the value itself, or an empty string, if the value was null or
   * undefined.
   * @param value the value to sanitize
  */
  public sanitize (value) {
    if (value === null || value === undefined) {
      return ''
    }
    return value
  }

  /**
   * Calculates the greatest common denominator of two numbers.
   * No order is required for the two numbers.
   * @param a a number
   * @param b another number
   */
  public gcd (a, b) {
    a = Math.abs(a)
    b = Math.abs(b)
    if (b > a) {
      const temp = a
      a = b
      b = temp
    }
    while (true) {
      if (b === 0) {
        return a
      }
      a %= b
      if (a === 0) {
        return b
      }
      b %= a
    }
  }
}

export const singleton = JsUtils.getInstance()
