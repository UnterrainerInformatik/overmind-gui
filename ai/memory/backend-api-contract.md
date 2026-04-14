---
name: backend-api-contract
description: What the Overmind REST API looks like from the client's point of view — endpoint list, list/paging shape, appliance command format.
---

# Backend REST API (as seen from the GUI)

The backend lives at `overmindserver.unterrainer.info:443` (HTTPS) by
default. The **only** source of truth in this repo for endpoint paths is
`src/store/rest.ts`.

## Endpoint registry

```
rest/config/endpoint = {
  application: {
    name:     '/',
    version:  '/version',
    health:   '/health',
    datetime: '/datetime',
  },
  crontabs:            '/setup/crontabs',
  logs:                '/setup/logs',
  appliances:          '/setup/appliances',
  guiSwitches:         '/setup/guiswitches',
  guiWindowContacts:   '/setup/guiwindowcontacts',
  localizedData:       '/localizeddata',
  plans:               '/plans',
  orderedPlans:        '/orderedplans',
  execute:             '/execute',
  triggerEvent:        '/triggerevent',
  reload:              '/setup/reload',
  reloadAppliances:    '/setup/reload',      # alias
  applianceToMappings: '/setup/appliancetomappings',
  mappingEntries:      '/setup/mappingentries',
  usedSwitches:        '/usedswitches',
  initialize:          '/setupappliance',
  reboot:              '/restartappliance',
  sunRiseSet:          '/sunriseset',
}
```

## List response shape

`getList` builds `GET /endpoint?size=<n>&offset=<m>[&extraParams]`.

The response is expected to be:

```json
{
  "entries": [ … ],
  // possibly more fields (total, page, …) — not enforced by the client
}
```

`axiosUtils.internalGet` throws if `isList && entries !== undefined && entries == null`
(note the awkward double-check — `!= null` would've been enough). Views read
`response.entries` directly.

Default size is `Number.MAX_SAFE_INTEGER` (i.e. "give me everything") —
views override it sparingly (Plans.vue uses size 1000).

## GET by ID

`GET /endpoint/<id>` → the object directly (no wrapper). Used by
`BaseService.getById` and by `plansService.isPlanEnabled`.

## PUT / POST / DELETE

- `PUT /endpoint/<id>` — body provided by a `() => object` callback
- `POST /endpoint` — body provided by a `() => object` callback
- `DELETE /endpoint/<id>` — empty body (`data: {}`)

All set `Content-Type` implicitly via axios (JSON) and include the
`Authorization: Bearer <token>` header if a Keycloak token is available
(see `known-issues-and-smells.md` — it isn't).

## Commanding appliances

`appliancesService` wraps `POST /execute` with a specific envelope:

```js
{
  applianceId: 145,
  actorPath:   'relays.0',           // caller-supplied, e.g. 'switch1'
  commands: [
    { name: 'on' },                   // turnOn
    { name: 'off' },                  // turnOff
    { name: 'brightness', params: [75] },                    // setBrightness
    { name: 'setRgb',     params: [r, g, b, w, a] },        // setColor
    { name: 'setWhite',   params: [brightness, temp] },     // setWhite
  ],
}
```

Commands are arrays, but the wrappers always send single-element arrays.
If you need to chain commands in one round-trip, extend the service or
call the raw `axiosUtils.post(server, 'execute', () => {…})`.

## Triggering events

`eventsService.trigger(() => ({ applianceId, sensorPath, eventPath }))` →
`POST /triggerevent`. Used by switch panels that mimic a sensor click
(e.g. "on.click", "off.holdStart").

## Appliance state shape (inferred from overmindUtils)

```ts
type Appliance = {
  id: number,
  name: string,
  type: 'SHUTTERS' | 'DIMMER' | 'BULB_RGB' | 'DEBUGGER' | 'GROUP_SERIAL'
      | 'GROUP_PARALLEL' | 'PLAN_MANIPULATOR' | 'SWITCH' | 'CONTACT_SENSOR'
      | 'MOTION_SENSOR' | 'PLUG' | 'RELAY' | 'RELAY_DUAL' | 'HT'
      | 'STATE_CHECKER',
  lastTimeOnline: string,           // ISO date
  config: string | object,          // JSON string; parsed in-place by parseConfig
  state: {
    relays?:       Array<{ state: 'on'|'off', power?: number }>,
    motions?:      Array<{ motion: boolean }>,
    closures?:     Array<{ open: boolean, tilt: number }>,
    temperatures?: Array<{ temperature: number }>,
    humidities?:   Array<{ humidity: number }>,
    luminosities?: Array<{ luminosityLevel: 'bright'|'twilight'|'dark'|'none' }>,
    batteries?:    Array<{ batteryLevel: number }>,   // 0..1
    hasExternalPower?: boolean,
  },
  // iconPos1 — fallback key when state.relays isn't populated
}
```

This is what `addOnOffStateTo` and `getPowerOf` expect. The actual server
contract may be richer; these fields are what the client touches.

## 24-hour offline rule

`overmindUtils.addOnOffStateTo` forces `onOffState = 'error'` if
`lastTimeOnline` is more than 24 hours old. This is a client-side
heuristic, not a server concept.

## Pagination/filtering

`getList` takes `additionalQueryParams` as a **raw string** like
`'id=5&searchName=hallo'`. No URL encoding is done by the helper — the
caller is responsible for escaping values with special characters.
