## MODIFIED Requirements

### Requirement: Non-aggregate subscriptions expose reactive per-path values

For a `spec` with no `aggregate` field, the returned `Subscription` SHALL expose `sub.values`, a Vue-reactive plain object whose keys are the strings `` `${applianceId}:${path}` `` for every `(applianceId, path)` pair in the spec's `selection`, with the following rule for wildcard entries:

- For any `(applianceId, paths)` entry in the selection whose `paths` array does NOT contain the wildcard string `'**'`, every one of that entry's `(applianceId, path)` keys SHALL be present in `sub.values` immediately upon return from `subscribe()` (initial value `undefined`). These keys are pre-declared and do not change for the life of the subscription.
- For any `(applianceId, paths)` entry whose `paths` array contains the wildcard string `'**'`, no key for that applianceId SHALL be pre-declared at subscribe time on the basis of the wildcard. (Any explicit sibling paths in the same entry's `paths` array are still pre-declared per the preceding rule.) Keys for that applianceId's wildcard-covered paths SHALL be added reactively the first time a `transport-update` delivers a triple for that `(applianceId, path)` combination, via the same mechanism Vue 2 requires for reactive dynamic-key addition (i.e. `Vue.set` or equivalent). After being added, such keys behave exactly like pre-declared keys for all subsequent updates, close-time clearing, and reconnect preservation.

Consumers SHALL be able to bind `sub.values['<id>:<path>']` in templates and `watch` it as-is, with Vue reactivity firing on value changes, regardless of whether the key was pre-declared or added dynamically. For non-aggregate subscriptions, `sub.aggregate` SHALL be `null`.

Each `transport-update` payload for the subscription's transport SHALL update `sub.values` by writing each triple `{applianceId, path, value}` into `sub.values[``${applianceId}:${path}``]` as a number (coerced via `Number.parseFloat` when not already a number; NaN normalized to `0`). Paths not present in a given payload SHALL be left untouched in `sub.values` — their previous latest-known value survives. The same `(applianceId, path, value)` triple SHALL ALSO continue to populate the shared `pathCache` as today, so `getLatestPath` behavior is unchanged.

#### Scenario: Subscription pre-populates explicit keys at subscribe time

- **WHEN** a consumer calls `sseClient.subscribe({ minInterval: 2000, selection: { perAppliance: [{applianceId: 148, paths: ['relays[0].power','relays[1].power']}] } })`
- **THEN** immediately upon return, `'148:relays[0].power' in sub.values` is `true` and `'148:relays[1].power' in sub.values` is `true`
- **AND** `sub.values['148:relays[0].power']` is `undefined`
- **AND** `sub.values['148:relays[1].power']` is `undefined`
- **AND** `sub.aggregate` is `null`

#### Scenario: Wildcard-path entry does not pre-declare keys

- **WHEN** a consumer calls `sseClient.subscribe({ minInterval: 300, selection: { perAppliance: [{applianceId: 177, paths: ['**']}] } })`
- **THEN** immediately upon return, no `'177:<path>'` key for this appliance is present in `sub.values` on the basis of the wildcard
- **AND** `Object.keys(sub.values).filter(k => k.startsWith('177:')).length` is `0`
- **AND** `sub.aggregate` is `null`

#### Scenario: Wildcard key is added reactively on first delivery

- **WHEN** a wildcard subscription for appliance `177` is active
- **AND** a `transport-update` arrives with `values: [{applianceId: 177, path: 'relays[0].power', value: 42}]`
- **THEN** `'177:relays[0].power' in sub.values` becomes `true`
- **AND** `sub.values['177:relays[0].power']` is `42`
- **AND** Vue templates and watchers bound to that key re-render / fire on this update exactly as they would for a pre-declared key

#### Scenario: Wildcard-discovered keys retain across delta updates

- **WHEN** a wildcard subscription for appliance `177` has received `'177:relays[0].power' → 42` and `'177:brightness' → 80` in prior `transport-update` events
- **AND** a subsequent `transport-update` arrives with only `{applianceId: 177, path: 'brightness', value: 85}`
- **THEN** `sub.values['177:brightness']` becomes `85`
- **AND** `sub.values['177:relays[0].power']` remains `42`

#### Scenario: Mixed selection — explicit keys pre-declared, wildcard keys dynamic

- **WHEN** a consumer calls `sseClient.subscribe({ minInterval: 300, selection: { perAppliance: [{applianceId: 148, paths: ['relays[0].power']}, {applianceId: 177, paths: ['**']}] } })`
- **THEN** immediately upon return, `'148:relays[0].power' in sub.values` is `true` with value `undefined`
- **AND** no `'177:<path>'` key for the wildcard appliance is present
- **WHEN** a `transport-update` arrives with `values: [{applianceId: 177, path: 'brightness', value: 70}]`
- **THEN** `'177:brightness' in sub.values` becomes `true` with value `70`
- **AND** `'148:relays[0].power'` remains `undefined`

#### Scenario: First payload populates selected keys (explicit selection, unchanged)

- **WHEN** a non-aggregate subscription with explicit paths is active
- **AND** a `transport-update` arrives with `values: [{applianceId: 148, path: 'relays[0].power', value: 42}, {applianceId: 148, path: 'relays[1].power', value: 30}]`
- **THEN** `sub.values['148:relays[0].power']` becomes `42`
- **AND** `sub.values['148:relays[1].power']` becomes `30`

#### Scenario: Delta payload updates only the paths it carries (unchanged)

- **WHEN** a non-aggregate subscription is active
- **AND** a prior `transport-update` set `sub.values['148:relays[0].power']` to `42` and `sub.values['148:relays[1].power']` to `30`
- **AND** a subsequent `transport-update` arrives with `values: [{applianceId: 148, path: 'relays[0].power', value: 45}]`
- **THEN** `sub.values['148:relays[0].power']` becomes `45`
- **AND** `sub.values['148:relays[1].power']` remains `30`

#### Scenario: Non-numeric or NaN values coerce to 0 (unchanged)

- **WHEN** a `transport-update` arrives with a triple whose value is a string that does not parse as a number (or is explicitly NaN)
- **THEN** `sub.values` is updated with `0` for that key

#### Scenario: Close clears all currently-present keys including dynamically-added wildcard keys

- **WHEN** a wildcard subscription has accumulated `'177:relays[0].power' → 42` and `'177:brightness' → 85` in `sub.values`
- **AND** the consumer calls `sub.close()`
- **THEN** `sub.values['177:relays[0].power']` becomes `undefined`
- **AND** `sub.values['177:brightness']` becomes `undefined`
- **AND** the keys remain present in `sub.values` (set to `undefined`), consistent with the clearing behavior for pre-declared keys
