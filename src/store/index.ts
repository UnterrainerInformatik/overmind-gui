import Vue from 'vue'
import Vuex from 'vuex'
import gui from '@/store/gui'
import rest from '@/store/rest'

Vue.use(Vuex)

const store = new Vuex.Store({

  modules: {
    gui,
    rest
  },

  state: () => ({
    version: '0.1.4'
  }),

  mutations: {
  },

  actions: {
  },

  getters: {
    version: state => {
      return state.version
    }
  }
})

export default store
