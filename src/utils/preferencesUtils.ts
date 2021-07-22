import store from '@/store'
import { getList, post, put } from '@/utils/axiosUtils'

function isValidResult (response) {
  return response != null && response !== undefined && response.entries.length > 0
}

export default {
  load: async function (userName) {
    return this.loadUser(userName).then(() => {
      return this.loadPreferences(userName)
    })
  },
  save: async function () {
    return this.saveUser().then(() => {
      return this.savePreferences()
    })
  },
  /**
   * Loads the user from the REST-service into VUEX.
   * @param userName the userName to load the user-object for
   */
  loadUser: async function (userName) {
    return getList('uinf', 'users', 1, 0, () => { return undefined }, () => { return undefined }, `&userName=${encodeURIComponent(userName)}`).then((response) => {
      if (isValidResult(response)) {
        const user = response.entries[0]
        store.dispatch('preferences/userId', user.userId)
        store.dispatch('preferences/userName', user.userName)
        store.dispatch('preferences/client', user.client)
        store.dispatch('preferences/givenName', user.givenName)
        store.dispatch('preferences/familyName', user.familyName)
        store.dispatch('preferences/email', user.email)
        store.dispatch('preferences/emailVerified', user.emailVerified)
        store.dispatch('preferences/realmRoles', user.realmRoles)
        store.dispatch('preferences/clientRoles', user.clientRoles)
        store.dispatch('preferences/isActive', user.isActive)
        store.dispatch('preferences/isBearer', user.isBearer)
      }
      return Promise.resolve()
    })
  },
  /**
   * Loads the preferences from the REST-service into VUEX.
   * @param userName the userName to load the preferences-object for
   */
  loadPreferences: async function (userName) {
    return getList('uinf', 'preferences', 1, 0, () => { return undefined }, () => { return undefined }, `&userName=${encodeURIComponent(userName)}`).then((response) => {
      if (isValidResult(response)) {
        const pref = response.entries[0]
        store.dispatch('preferences/darkTheme', pref.darkTheme)
        store.dispatch('preferences/languageKey', pref.languageKey)
      }
      return Promise.resolve()
    })
  },
  /**
   * Persists the user stored in VUEX to the REST-service.
   */
  saveUser: async function () {
    const userId = store.getters['preferences/userId']
    return put('uinf', 'users', userId, () => {
      return undefined
    }, () => {
      return {
        userId: userId,
        userName: store.getters['preferences/userName'],
        client: store.getters['preferences/client'],
        givenName: store.getters['preferences/givenName'],
        familyName: store.getters['preferences/familyName'],
        email: store.getters['preferences/email'],
        emailVerified: store.getters['preferences/emailVerified'],
        realmRoles: store.getters['preferences/realmRoles'],
        clientRoles: store.getters['preferences/clientRoles'],
        isActive: store.getters['preferences/isActive'],
        isBearer: store.getters['preferences/isBearer']
      }
    }, () => { return undefined })
  },
  /**
   * Persists the preferences stored in VUEX to the REST-service.
   */
  savePreferences: async function () {
    const userName = store.getters['preferences/userName']
    return getList('uinf', 'preferences', 1, 0, () => { return undefined }, () => { return undefined }, `&userName=${encodeURIComponent(userName)}`).then((response) => {
      if (isValidResult(response)) {
        // Update old.
        const entity = response.entries[0]
        entity.languageKey = store.getters['preferences/languageKey']
        entity.darkTheme = store.getters['preferences/darkTheme']
        return put('uinf', 'preferences', entity.id, () => { return undefined }, () => { return entity }, () => { return undefined })
      }
      // Make new.
      return post('uinf', 'preferences', () => { return undefined }, () => {
        return {
          languageKey: store.getters['preferences/languageKey'],
          darkTheme: store.getters['preferences/darkTheme']
        }
      }, () => { return undefined })
    })
  }
}
