import tooltips from './toolTips'
import snackbar from './snackbar'

const store = {

  namespaced: true,

  modules: {
    tooltips,
    snackbar
  },

  state: () => ({
    kioskMode: false,
    modalLoading: false,
    drawerVisible: false,
    lastMdAndUp: true,
    floorplan: null
  }),

  mutations: {
    kioskMode (state, value) {
      state.kioskMode = value
    },
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
    },
    floorplan (state, value) {
      state.floorplan = value
    }
  },

  actions: {
    kioskMode (context, value) {
      context.commit('kioskMode', value)
      return Promise.resolve()
    },
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
    },
    floorplan (context, value) {
      context.commit('floorplan', value)
      return Promise.resolve()
    }
  },

  getters: {
    kioskMode: state => {
      return state.kioskMode
    },
    modalLoading: state => {
      return state.modalLoading
    },
    drawerVisible: state => {
      return state.drawerVisible
    },
    lastMdAndUp: state => {
      return state.lastMdAndUp
    },
    floorplan: state => {
      return state.floorplan
    }
  }

}

export default store
