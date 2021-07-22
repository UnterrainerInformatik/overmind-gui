const store = {

  namespaced: true,

  state: () => ({
    config: {
      servers: {
        uinf: {
          protocol: process.env.VUE_APP_PROTOCOL ? process.env.VUE_APP_PROTOCOL : 'https',
          address: process.env.VUE_APP_ADDRESS ? process.env.VUE_APP_ADDRESS : 'nexus-server.unterrainer.info',
          port: process.env.VUE_APP_PORT ? process.env.VUE_APP_PORT : '443'
          // protocol: process.env.VUE_APP_PROTOCOL ? process.env.VUE_APP_PROTOCOL : 'http', // DEV
          // address: process.env.VUE_APP_ADDRESS ? process.env.VUE_APP_ADDRESS : 'localhost', // DEV
          // port: process.env.VUE_APP_PORT ? process.env.VUE_APP_PORT : '1180' // DEV
        }
      },
      endpoint: {
        application: {
          name: '/',
          version: '/version',
          health: '/health',
          datetime: '/datetime'
        },
        crontab: {
          runs: '/crontab/runs'
        },
        logs: '/logs',
        users: '/users',
        preferences: '/preferences'
      }
    }
  }),

  mutations: {
  },

  actions: {
  },

  getters: {
    config: state => {
      return state.config
    }
  }

}

export default store
