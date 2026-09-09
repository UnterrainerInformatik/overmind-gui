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
        // The probe hangs off the node rather than off a camera because the
        // setup assistant probes a camera that does not exist yet - a
        // /setup/cameras/{id}/... route could not serve that caller at all.
        // The node is the machine that can reach the camera, so it takes the
        // URL to probe in the body; the stored camera's settings dialog simply
        // passes the URL it already has.
        nodeStreamProbe: '/setup/nodes/{id}/streamProbe',
        // Camera media, resolved by overmind to the node that holds the camera
        // (top-level, not /setup/... - computed/streamed rather than stored,
        // same precedent as /usedswitches and /reconciliation). The GUI never
        // addresses a node or a Frigate key; see frigateService.ts for the
        // shapes these answer with.
        cameraStream: '/cameras/{id}/stream',
        cameraEvents: '/cameras/{id}/events',
        // The merged route is what the events page asks: one request per node
        // instead of one per camera, and a node that is down is a named gap in
        // the answer rather than a failed call. The media of an event is not
        // listed here at all - the server sends the URLs with the event, so
        // they are read from the payload instead of built from a template.
        cameraEventsMerged: '/cameras/events',
        // The long-term event archive (openspec change `archive-save-button`)
        // and the permanent delete of a recording (openspec change
        // `event-permanent-delete`). One comment, because they are one story:
        // a saved event lives in two places and the delete has to reach both.
        // **Assumed shapes**: java-overmind-server serves none of these routes
        // yet - the archive ones are what `ai/open-proposals.md` section A
        // states, which mirror that repository's own primer, the delete is what
        // its section F states, and both are re-checked once it does. Until
        // then every call answers 404, which the events page swallows for the
        // archive (see archiveService.ts) and reports for the delete.
        //   POST   eventArchive  -> { archiveId }
        //   GET    archiveItems  -> { items: [...] }
        //   DELETE archiveItems/{archiveId} -> 204
        //   DELETE cameraEvent   -> 204, the event and its media gone at the
        //          source. 404 is counted as success by both deletes alike:
        //          what is already gone is the state the caller asked for.
        // A single archive item is addressed through the house CRUD helper -
        // `axiosUtils.del(server, 'archiveItems', archiveId)` appends the id and
        // resolves to '/archive/items/{archiveId}' - so it needs no entry of its
        // own, while the two paths that carry placeholders are filled by
        // `axiosUtils.postToPath()` and `axiosUtils.deleteFromPath()`.
        archiveItems: '/archive/items',
        eventArchive: '/cameras/{id}/events/{eventId}/archive',
        // The event itself. `cameraEvents` above is the same path without the
        // event id and is only ever read; this one is only ever deleted.
        cameraEvent: '/cameras/{id}/events/{eventId}',
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
