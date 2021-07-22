export function toggleItem (item, array) {
  const index = array.indexOf(item)
  if (index === -1) {
    array.push(item)
  } else {
    array.splice(index, 1)
  }
}

export function removeItem (item, array) {
  const index = array.indexOf(item)
  if (index !== -1) {
    array.splice(index, 1)
  }
}

export function containsItem (item, array) {
  return array.indexOf(item) !== -1
}

/**
 * Returns the value itself, or an empty string, if the value was null or undefined.
 * @param value the value to sanitize
 */
export function sanitize (value) {
  if (value === null || value === undefined) {
    return ''
  }
  return value
}
