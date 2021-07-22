import tooltips from './toolTips'
import snackbar from './snackbar'

const store = {

  namespaced: true,

  modules: {
    tooltips,
    snackbar
  },

  state: () => ({
    modalLoading: false,
    drawerVisible: false,
    lastMdAndUp: true
  }),

  mutations: {
    modalLoading (state, value) {
      state.modalLoading = value
    },
    drawerVisible (state, value) {
      state.drawerVisible = value
    },
    toggleDrawerVisible (state) {
      state.drawerVisible = !state.drawerVisible
    },
    lastMdAndUp (state, value) {
      state.lastMdAndUp = value
    }
  },

  actions: {
    modalLoading (context, value) {
      context.commit('modalLoading', value)
      return Promise.resolve()
    },
    drawerVisible (context, { value, time }) {
      setTimeout(() => {
        context.commit('drawerVisible', value)
      }, time)
      return Promise.resolve()
    },
    toggleDrawerVisible (context) {
      context.commit('toggleDrawerVisible')
      return Promise.resolve()
    },
    lastMdAndUp (context, value) {
      context.commit('lastMdAndUp', value)
      return Promise.resolve()
    }
  },

  getters: {
    modalLoading: state => {
      return state.modalLoading
    },
    drawerVisible: state => {
      return state.drawerVisible
    },
    lastMdAndUp: state => {
      return state.lastMdAndUp
    }
  }

}

export default store
