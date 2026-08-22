const store = {

  namespaced: true,

  state: () => ({
    config: {
      servers: {
        uinf: {
          protocol: process.env.VUE_APP_PROTOCOL ? process.env.VUE_APP_PROTOCOL : 'https',
          address: process.env.VUE_APP_ADDRESS ? process.env.VUE_APP_ADDRESS : 'overmindserver.unterrainer.info',
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
        guiSwitches: '/setup/guiswitches',
        localizedData: '/localizeddata',
        plans: '/plans',
        orderedPlans: '/orderedplans',
        execute: '/execute',
        triggerEvent: '/triggerevent',
        reload: '/setup/reload',
        applianceToMappings: '/setup/appliancetomappings',
        mappingEntries: '/setup/mappingentries',
        usedSwitches: '/usedswitches',
        guiWindowContacts: '/setup/guiwindowcontacts',
        initialize: '/setupappliance',
        reboot: '/restartappliance',
        reloadAppliances: '/setup/reload',
        sunRiseSet: '/sunriseset',
        // Path + shape confirmed against java-overmind-server's in-progress
        // reconciliation-status-endpoint change (top-level, not /setup/... —
        // matches the /usedswitches precedent for computed/status endpoints).
        // Not deployed yet as of 2026-08-22 — confirmed via that repo's
        // openspec/changes/reconciliation-status-endpoint/design.md and the
        // already-implemented FieldReconciliationCoordinator.getStatus(...).
        migrations: '/reconciliation',
        sseAppliances: '/sse/appliances',
        sseTransportsRegister: '/sse/transports/register',
        sseTransportsDeregister: '/sse/transports/deregister'
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
