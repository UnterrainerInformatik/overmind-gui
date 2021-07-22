const store = {

  namespaced: true,

  state: () => ({
    userId: null,
    userName: null,
    client: null,
    givenName: null,
    familyName: null,
    email: null,
    emailVerified: null,
    realmRoles: null,
    clientRoles: null,
    isActive: null,
    isBearer: null,

    darkTheme: false,
    languageKey: 'de'
  }),

  mutations: {
    userId (state, value) {
      state.userId = value
    },
    darkTheme (state, value) {
      state.darkTheme = value
    },
    languageKey (state, value) {
      state.languageKey = value
    },
    userName (state, value) {
      state.userName = value
    },
    client (state, value) {
      state.client = value
    },
    givenName (state, value) {
      state.givenName = value
    },
    familyName (state, value) {
      state.familyName = value
    },
    email (state, value) {
      state.email = value
    },
    emailVerified (state, value) {
      state.emailVerified = value
    },
    realmRoles (state, value) {
      state.realmRoles = value
    },
    clientRoles (state, value) {
      state.clientRoles = value
    },
    isActive (state, value) {
      state.isActive = value
    },
    isBearer (state, value) {
      state.isBearer = value
    }
  },

  actions: {
    userId (context, value) {
      context.commit('userId', value)
      return Promise.resolve()
    },
    darkTheme (context, value) {
      context.commit('darkTheme', value)
      return Promise.resolve()
    },
    languageKey (context, value) {
      context.commit('languageKey', value)
      return Promise.resolve()
    },
    userName (context, value) {
      context.commit('userName', value)
      return Promise.resolve()
    },
    client (context, value) {
      context.commit('client', value)
      return Promise.resolve()
    },
    givenName (context, value) {
      context.commit('givenName', value)
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
    },
    realmRoles (context, value) {
      context.commit('realmRoles', value)
      return Promise.resolve()
    },
    clientRoles (context, value) {
      context.commit('clientRoles', value)
      return Promise.resolve()
    },
    isActive (context, value) {
      context.commit('isActive', value)
      return Promise.resolve()
    },
    isBearer (context, value) {
      context.commit('isBearer', value)
      return Promise.resolve()
    }
  },

  getters: {
    userId: state => {
      return state.userId
    },
    userName: state => {
      return state.userName
    },
    darkTheme: state => {
      return state.darkTheme
    },
    languageKey: state => {
      return state.languageKey
    }
  }

}

export default store
