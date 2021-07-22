const store = {

  namespaced: true,

  state: () => ({
    visible: false,
    messages: new Array<unknown>()
  }),

  mutations: {
    snackbarVisible (state, value) {
      state.visible = value
    },
    snackbarEnqueue (state, message) {
      state.messages.unshift(message)
    },
    snackbarDequeue (state) {
      if (state.messages.length > 0) {
        state.messages.pop()
      }
    }
  },

  actions: {
    snackbarEnqueue (context, message) {
      if (context.state.messages.length === 0) {
        context.commit('snackbarVisible', true)
      }
      // Drop if queue is 'full'.
      if (context.state.messages.length < 10) {
        context.commit('snackbarEnqueue', message)
      }
      return Promise.resolve()
    },
    snackbarDequeue (context) {
      context.commit('snackbarVisible', false)
      // Display next message after some time.
      setTimeout(() => {
        context.commit('snackbarDequeue')
        if (context.state.messages.length > 0) {
          context.commit('snackbarVisible', true)
        }
      }, 300)
      return Promise.resolve()
    }
  },

  getters: {
    snackbarVisible: state => {
      return state.visible
    },
    snackbarCurrent: state => {
      if (state.messages.length === 0) {
        return {}
      }
      return state.messages[state.messages.length - 1]
    }
  }

}

export default store
