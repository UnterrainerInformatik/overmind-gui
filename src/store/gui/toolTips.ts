const store = {

  namespaced: true,

  state: () => ({
    tooltips: true,
    openDelay: 800
  }),

  mutations: {
    tooltips (state, value) {
      state.tooltips = value
    },
    openDelay (state, value) {
      state.openDelay = value
    }
  },

  actions: {
    tooltips (context, value) {
      context.commit('tooltips', value)
      return Promise.resolve()
    },
    openDelay (context, value) {
      context.commit('openDelay', value)
      return Promise.resolve()
    }
  },

  getters: {
    tooltips: state => {
      return state.tooltips
    },
    openDelay: state => {
      return state.openDelay
    }
  }

}

export default store
