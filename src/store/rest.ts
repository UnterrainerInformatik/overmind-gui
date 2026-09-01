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
        // Camera registry (java-overmind-server change camera-registry-and-node-routing).
        // Plain /setup/* CRUD collections like the entries above; the two test
        // endpoints hang an action off a single entry, so their path carries
        // the id as a {id} placeholder that axiosUtils.postToPath() fills in.
        cameras: '/setup/cameras',
        cameraTest: '/setup/cameras/{id}/test',
        nodes: '/setup/nodes',
        nodeTest: '/setup/nodes/{id}/test',
        // Path + shape confirmed 2026-08-22 against java-overmind-server's
        // deployed reconciliation endpoints (top-level, not /setup/... —
        // matches the /usedswitches precedent for computed/status endpoints).
        // GET /reconciliation entries carry errorNodes AND pendingNodes
        // (each {applianceId, name, attemptCount, errorMessages}); there is
        // no bulk retry-pending endpoint, only retry (single) and
        // retry/errors (bulk) — see FieldReconciliationCoordinator.java.
        migrations: '/reconciliation',
        migrationsRetry: '/reconciliation/retry',
        migrationsRetryErrors: '/reconciliation/retry/errors',
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
