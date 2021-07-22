import { warning } from './loggingUtils'

export function getProperty (name, o) {
  if (name === null || name === '') {
    warning('The property name cannot be null or empty.', 'internal')
    return null
  }
  if (o === null) {
    warning(`The object that should contain the property '${name}' is null.`, 'internal')
    return null
  }
  if (Object.prototype.hasOwnProperty.call(o, name)) {
    return o[name]
  }
  warning(`Could not find property [${name}] in given object.`, 'internal')
  return null
}

export function getDeepProperty (path, o) {
  if (path === null || path === '') {
    warning('The property path cannot be null or empty.', 'internal')
    return null
  }
  if (o === null) {
    warning(`The object that should contain the property path '${path}' is null.`, 'internal')
    return null
  }
  const paths = path.split('.')
  let obj = o
  for (let i = 0; i < paths.length; ++i) {
    obj = getProperty(paths[i], obj)
    if (obj === null) {
      return null
    }
  }
  return obj
}
