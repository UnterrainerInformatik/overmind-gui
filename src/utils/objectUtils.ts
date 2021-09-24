import { singleton as log } from '@/utils/loggingUtils'

class ObjectUtils {
  private static instanceField: ObjectUtils

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new ObjectUtils())
    }
    return this.instanceField
  }

  public getProperty (name, o) {
    if (name === null || name === '') {
      log.warning('The property name cannot be null or empty.', 'internal')
      return null
    }
    if (o === null) {
      log.warning(`The object that should contain the property '${name}' is null.`, 'internal')
      return null
    }
    if (Object.prototype.hasOwnProperty.call(o, name)) {
      return o[name]
    }
    log.warning(`Could not find property [${name}] in given object.`, 'internal')
    return null
  }

  public getDeepProperty (path, o) {
    if (path === null || path === '') {
      log.warning('The property path cannot be null or empty.', 'internal')
      return null
    }
    if (o === null) {
      log.warning(`The object that should contain the property path '${path}' is null.`, 'internal')
      return null
    }
    const paths = path.split('.')
    let obj = o
    for (let i = 0; i < paths.length; ++i) {
      obj = this.getProperty(paths[i], obj)
      if (obj === null) {
        return null
      }
    }
    return obj
  }
}

export const singleton = ObjectUtils.getInstance()
