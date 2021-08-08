const store = {

  namespaced: true,

  state: () => ({
    config: {
      servers: {
        uinf: {
          protocol: process.env.VUE_APP_PROTOCOL ? process.env.VUE_APP_PROTOCOL : 'https',
          address: process.env.VUE_APP_ADDRESS ? process.env.VUE_APP_ADDRESS : 'overmind-server.unterrainer.info',
          port: process.env.VUE_APP_PORT ? process.env.VUE_APP_PORT : '443'
          // protocol: process.env.VUE_APP_PROTOCOL ? process.env.VUE_APP_PROTOCOL : 'http', // DEV
          // address: process.env.VUE_APP_ADDRESS ? process.env.VUE_APP_ADDRESS : 'localhost', // DEV
          // port: process.env.VUE_APP_PORT ? process.env.VUE_APP_PORT : '8080' // DEV
        }
      },
      endpoint: {
        application: {
          name: '/',
          version: '/version',
          health: '/health',
          datetime: '/datetime'
        },
        crontabs: '/setup/crontabs',
        logs: '/setup/logs',
        appliances: '/setup/appliances',
        applianceDescriptions: '/setup/appliancedescriptions',
        plans: '/plans',
        orderedPlans: '/orderedplans',
        execute: '/execute',
        triggerEvent: '/triggerevent',
        setupAppliance: '/setupAppliance',
        reload: '/setup/reload',
        applianceToMappings: '/setup/appliancetomappings',
        mappingEntries: '/setup/mappingentries',
        usedSwitches: '/usedswitches'
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
