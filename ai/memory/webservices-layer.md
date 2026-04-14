---
name: webservices-layer
description: How REST calls are structured — BaseService, axiosUtils, endpoint resolution via store, and the singleton convention used by every service.
---

# REST / webservices layer

## Files

```
src/utils/
├── axiosUtils.ts                                # the HTTP engine (singleton)
└── webservices/
    ├── interfaces/
    │   ├── CrudService.ts            # getById, getList, getFirst, del, put, post
    │   ├── BaseService.ts            # default impl delegating to axiosUtils
    │   └── GetListConfigObject.ts    # { size?, offset?, additionalQueryParams? }
    ├── appliancesService.ts          # + execute commands (on/off/brightness/rgb/white)
    ├── applicationService.ts         # /, /version, /health, /datetime
    ├── eventsService.ts              # POST /triggerevent (not CRUD)
    ├── guiSwitchesService.ts         # empty subclass of BaseService
    ├── guiWindowContactsService.ts   # empty subclass
    ├── localizedDataService.ts
    ├── plansService.ts               # + execute, getOrderedPlans, isPlanEnabled
    ├── sunRiseSetService.ts
    └── systemService.ts
```

## The singleton idiom (copy-pasted everywhere)

```ts
export class FooService extends BaseService {
  private static instanceField: FooService
  constructor () { super('uinf', 'fooEndpointKey') }
  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new FooService())
    }
    return this.instanceField
  }
}
export const singleton = FooService.getInstance()
```

Views import it as `import { singleton as fooService } from '@/utils/webservices/fooService'`.
The `this.instanceField || (…)` expression is a no-op belt-and-suspenders.

## How a call flows

1. View calls `appliancesService.getById(145)`.
2. `BaseService.getById` calls `axiosUtils.getById('uinf', 'appliances', 145)`.
3. `axiosUtils.buildBaseUrl('uinf')` uses `objectUtils.getDeepProperty('uinf',
   store.getters['rest/config'].servers)` → `{protocol, address, port}` →
   `https://overmindserver.unterrainer.info:443`.
4. The endpoint key `'appliances'` is resolved against
   `store.getters['rest/config'].endpoint` → `'/setup/appliances'`.
5. A bearer token is read from `store.getters['keycloak/token']` (⚠ see
   known-issues.md — that module is not registered).
6. Request fires. On error, `appendErrorCatcher` extracts `err.response.status`
   and `err.response.data.message`, calls `log.error(msg, 'communication',
   status)` (which routes to the snackbar — but the logger is deactivated by
   default, so errors are silently swallowed).

## Endpoint registry

Defined once in `src/store/rest.ts`:

```
rest/config/endpoint = {
  application: { name, version, health, datetime },
  crontabs, logs, appliances, guiSwitches, localizedData, plans,
  orderedPlans, execute, triggerEvent, reload, applianceToMappings,
  mappingEntries, usedSwitches, guiWindowContacts, initialize, reboot,
  reloadAppliances, sunRiseSet
}
```

Services reference endpoints **by key string**, not by hard-coded paths. To
add a new endpoint, extend `rest.ts` AND pass the key into the service
constructor or ad-hoc call.

## Auth

Bearer token via `Authorization: Bearer <token>` if `store.getters['keycloak/token']`
returns a truthy value; otherwise no header. See known-issues.md — this getter
is currently always undefined.

## dataProvider pattern for PUT/POST

`put(id, () => bodyObject)` and `post(() => bodyObject)` take a zero-arg function,
not the body directly. `axiosUtils.provideData` also supports passing a string
path to a Vuex getter (`store.getters[dataProvider]`), though no code in this
repo currently uses that variant.
