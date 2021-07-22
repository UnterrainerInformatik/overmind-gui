import store from '@/store'

async function removeTokensFromLocalStorage () {
  console.log('Removing keycloak tokens from local storage.')
  localStorage.removeItem('kc-token')
  localStorage.removeItem('kc-refresh-token')
  return Promise.resolve()
}

async function persistTokensToLocalStorage (keycloak) {
  console.log('Saving tokens.')
  if (keycloak.token !== undefined) {
    localStorage.setItem('kc-token', keycloak.token)
  } else {
    console.warn('"keycloak.token" is undefined.')
  }
  if (keycloak.refreshToken !== undefined) {
    localStorage.setItem('kc-refresh-token', keycloak.refreshToken)
  } else {
    console.warn('"keycloak.refreshToken" is undefined.')
  }
  return Promise.resolve()
}

export default {
  getTokenFromLocalStorage: function () {
    const token = localStorage.getItem('kc-token')
    if (token == null || token === undefined) {
      console.log('Keycloak token persisted in local storage is missing.')
      return undefined
    }
    return token
  },
  getRefreshTokenFromLocalStorage: function () {
    const token = localStorage.getItem('kc-refresh-token')
    if (token == null || token === undefined) {
      console.log('Keycloak refresh-token persisted in local storage is missing.')
      return undefined
    }
    return token
  },
  persist: async function (keycloak) {
    store.dispatch('keycloak/instance', keycloak)
    // console.log(keycloak)
    const token = keycloak.tokenParsed
    // console.log(token)
    if (token !== undefined) {
      store.dispatch('keycloak/token', keycloak.token)
      store.dispatch('keycloak/realmRoles', token.realm_access.roles)
      if (token.resource_access && token.resource_access[token.azp]) {
        store.dispatch('keycloak/clientRoles', token.resource_access[token.azp].roles)
      }
      store.dispatch('keycloak/givenName', token.given_name)
      store.dispatch('keycloak/familyName', token.family_name)
      store.dispatch('keycloak/email', token.email)
      store.dispatch('keycloak/emailVerified', token.email_verified)
      store.dispatch('keycloak/userName', token.preferred_username)
    }
    return persistTokensToLocalStorage(keycloak)
  },
  reset: async function () {
    store.dispatch('keycloak/instance', null)
    store.dispatch('keycloak/token')
    store.dispatch('keycloak/realmRoles', [])
    store.dispatch('keycloak/clientRoles', [])
    store.dispatch('keycloak/givenName', '')
    store.dispatch('keycloak/familyName', '')
    store.dispatch('keycloak/email', '')
    store.dispatch('keycloak/emailVerified', false)
    store.dispatch('keycloak/userName', null)
    return removeTokensFromLocalStorage()
  },
  logout: async function () {
    const promise = this.reset()
    const keycloak = store.getters['keycloak/instance']
    if (keycloak != null) {
      return promise.then(() => keycloak.logout()).then(() => keycloak.clearToken()).then(() => this.reset())
    }
    return promise
  }
}
