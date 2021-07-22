const store = {

  namespaced: true,

  state: () => ({
    host: process.env.VUE_APP_KEYCLOAK_HOST ? process.env.VUE_APP_KEYCLOAK_HOST : 'https://keycloak.unterrainer.info/auth',
    realm: process.env.VUE_APP_KEYCLOAK_REALM ? process.env.VUE_APP_KEYCLOAK_REALM : 'Nexus',
    client: process.env.VUE_APP_KEYCLOAK_CLIENT ? process.env.VUE_APP_KEYCLOAK_CLIENT : 'Nexus',
    instance: null,
    token: '',
    realmRoles: [],
    clientRoles: [],
    userName: null,
    givenName: '',
    familyName: '',
    email: '',
    emailVerified: false
  }),

  mutations: {
    host (state, value) {
      state.host = value
    },
    realm (state, value) {
      state.realm = value
    },
    client (state, value) {
      state.client = value
    },
    instance (state, value) {
      state.instance = value
    },
    token (state, value) {
      state.token = value
    },
    realmRoles (state, value) {
      state.realmRoles = value
    },
    clientRoles (state, value) {
      state.clientRoles = value
    },
    givenName (state, value) {
      state.givenName = value
    },
    userName (state, value) {
      state.userName = value
    },
    familyName (state, value) {
      state.familyName = value
    },
    email (state, value) {
      state.email = value
    },
    emailVerified (state, value) {
      state.emailVerified = value
    }
  },

  actions: {
    host (context, value) {
      context.commit('host', value)
      return Promise.resolve()
    },
    realm (context, value) {
      context.commit('realm', value)
      return Promise.resolve()
    },
    client (context, value) {
      context.commit('client', value)
      return Promise.resolve()
    },
    instance (context, value) {
      context.commit('instance', value)
      return Promise.resolve()
    },
    token (context, value) {
      context.commit('token', value)
      return Promise.resolve()
    },
    realmRoles (context, value) {
      context.commit('realmRoles', value)
      return Promise.resolve()
    },
    clientRoles (context, value) {
      context.commit('clientRoles', value)
      return Promise.resolve()
    },
    givenName (context, value) {
      context.commit('givenName', value)
      return Promise.resolve()
    },
    userName (context, value) {
      context.commit('userName', value)
      return Promise.resolve()
    },
    familyName (context, value) {
      context.commit('familyName', value)
      return Promise.resolve()
    },
    email (context, value) {
      context.commit('email', value)
      return Promise.resolve()
    },
    emailVerified (context, value) {
      context.commit('emailVerified', value)
      return Promise.resolve()
    }
  },

  getters: {
    host: state => {
      return state.host
    },
    realm: state => {
      return state.realm
    },
    client: state => {
      return state.client
    },
    instance: state => {
      return state.instance
    },
    token: state => {
      return state.token
    },
    realmRoles: state => {
      return state.realmRoles
    },
    clientRoles: state => {
      return state.clientRoles
    },
    givenName: state => {
      return state.givenName
    },
    userName: state => {
      return state.userName
    },
    familyName: state => {
      return state.familyName
    },
    email: state => {
      return state.email
    },
    emailVerified: state => {
      return state.emailVerified
    }
  }

}

export default store
