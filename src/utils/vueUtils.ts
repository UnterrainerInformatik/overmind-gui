import vuetify from '@/plugins/vuetify'

class VueUtils {
  private static instanceField: VueUtils

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new VueUtils())
    }
    return this.instanceField
  }

  public adaptive (array: object[]) {
    switch (vuetify.framework.breakpoint.name) {
      case 'xs':
        return array[0]
      case 'sm':
        return array[1]
      case 'md':
        return array[2]
      case 'lg':
        return array[3]
      case 'xl':
        return array[4]
    }
  }

  /**
   * This method gets the correct image (light/dark) for the currently selected theme.
   *
   * @param isDark send this.$vuetify.theme.dark here
   * @param namePreDelimiter the part of the file-name that goes before the black/white part
   * @param namePostDelimiter the part of the file-name that goes after the black/white part
   * @returns the string of the image that matches the theme-mode
   */
  public getThemedImage (isDark: boolean, namePreDelimiter: string, namePostDelimiter: string) {
    return namePreDelimiter + (isDark ? 'white' : 'black') + namePostDelimiter
  }

  /**
   * Groups the give array into groups of the given size (at max).
   *
   * @param array the input array
   * @param groupSize the number of items one group should contain at max
   */
  public group (array: object[], groupSize: number) {
    const result: object[] = []
    let newGroup: object[] = []
    for (let i = 0; i < array.length; i++) {
      const element = array[i]
      newGroup.push(element)
      if ((i + 1) % groupSize === 0) {
        result.push(newGroup)
        newGroup = []
      }
    }
    if (newGroup.length > 0) {
      result.push(newGroup)
    }
    return result
  }

  /**
   * Follows the one-based indexed main-field-name in the translation-keys of the currently selected language until it is
   * not set any longer (example: mainFieldName='title', title1, title2, title3...) and retrieves its values along with
   * the values of any given additional-column-name (optional, string or array of strings; those are just not set if there
   * are not present in the current translation-index)
   *
   * @param i18n the this.$i18n object
   * @param path the base-path to prefix in front of the mainFieldName and additionalFieldNames (without a dot)
   * @param mainFieldName the main field to follow (index is started with 1 and incremented, until it is no longer set)
   * @param additionalFieldNames any additional fields to retrieve
   * @returns an object containing the main-field-content (the name of this field is the mainFieldName you entered) and
   * all of the additional-field-content, if they were present (the name of those filds is the corresponding
   * additionalFieldName)
   */
  public getNumberedTranslationObjectArray (i18n, path, mainFieldName, additionalFieldNames) {
    if (!mainFieldName) {
      return {}
    }
    if (additionalFieldNames && !Array.isArray(additionalFieldNames)) {
      additionalFieldNames = [additionalFieldNames]
    }

    const locale = i18n.locale
    const basePath = i18n.messages[locale]
    const result: object[] = []
    let i = 1
    let main = basePath[`${path}.${mainFieldName}${i}`]
    while (main && main != null) {
      const item = {}
      item[mainFieldName] = main
      if (additionalFieldNames) {
        additionalFieldNames.forEach(element => {
          const value = basePath[`${path}.${element}${i}`]
          if (value) {
            item[element] = value
          }
        })
      }
      result.push(item)
      i++
      main = basePath[`${path}.${mainFieldName}${i}`]
    }
    // console.log(result)
    return result
  }
}

export const singleton = VueUtils.getInstance()
