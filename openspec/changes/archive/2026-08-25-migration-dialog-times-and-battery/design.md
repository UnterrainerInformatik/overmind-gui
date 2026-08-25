## Context

See proposal.md — Why. The dialog in `src/views/KioskMigrations.vue` already fetches the appliance record once per open (`appliancesService.getById`) and normalizes it into a flat `selectedAppliance` object whose null fields are skipped by the template. This change adds fields to that object and lines to that block; the fetch, the stale-response guard and the loading/error states from `node-info-dialog` are reused unchanged.

The two migration times do not exist in the backend today; the battery values do. Verified against `java-overmind-server` on 2026-08-25:

- `ReconciliationNodeJson` is `{applianceId, name, attemptCount, errorMessages}` (`jsons/ReconciliationNodeJson.java:16-23`). `FieldReconciliationCoordinator.TargetState` keeps `pending`/`failed`/`done` sets and a `Map<Long, List<String>>` of reason strings (`baseobjects/FieldReconciliationCoordinator.java:101-113`) — counts and text, never times. The persisted `reconciliation_action` row has one `editedOn` for the whole target, rewritten on every node's success or failure, and it is not serialized by the endpoint.
- `BatteryStateJson` has exactly one field, `batteryLevel` (`jsons/state/BatteryStateJson.java:12`) — no measurement time. It does not need one: see Decision 1.
- Available today and sufficient for the whole battery line: `batteryDriven` on `ApplianceJson` (`:33`), `batteryLevel` (0..1) inside the parsed `state`, and `lastTimeOnline` (`:29`).

The companion backend change `reconciliation-node-times` supplies the two migration times. This change is written to render correctly before and after that lands.

## Goals / Non-Goals

**Goals**
- Additive lines in the existing information block, each independently skippable, so the change is useful the day it ships and completes itself as the backend fills in.
- One consistent time format across the whole dialog.
- Tolerate both the current `errorMessages: string[]` and a future timestamped shape without a version flag.

**Non-Goals**
- No caching, no extra polling, no second request: everything comes from the migrations poll already running and the one appliance fetch already made.
- No battery history, trend or projection — one reading and its age.
- No change to the chips, the columns, the panels or the retry actions.

## Decisions

1. **The battery level needs no time of its own, and no new backend field.** The stored `state` is what the appliance wants the server to hold. When a device makes contact and posts no new battery level, that silence is itself the statement that the stored level still stands — either it has not moved, or not far enough to be worth reporting. So the level is the appliance's own answer as of its last contact, whatever that contact was for, and `lastTimeOnline` is the time through which it is valid rather than an upper bound on its age. The backend is consistent with this: liveness is refreshed in the same message-handling call that would carry a battery update (`MqttApplianceSubscriptionManager.java:72,78`).
   Two consequences. First, adding a measurement time to `BatteryStateJson` — the approach first considered — is rejected: it is backend work across eight write sites to record a *transmission* time, when the value a reader wants is the *validity* time the record already carries. Second, the dialog renders the battery line without any timestamp: the last-time-online line sits in the same block and already is that validity time, so putting it on the battery line too would print one value twice in six lines of text.
2. **Battery-driven is taken from `batteryDriven`, not inferred from the presence of a battery reading.** A mains-powered device that once reported a battery value, or a `hasExternalPower` HT, would otherwise sprout a meaningless battery line. `batteryDriven` is the backend's own answer to the question the spec asks.
3. **Level formatting matches the rest of the GUI**: `Math.round(batteryLevel * 100)` and a `%` suffix, as `AppliancePanel` and `Floorplan` already do. The dialog renders it as a labeled text line rather than embedding `BatteryIndicator`, because that component is a 36 px fab tuned for a chip row and would break the block's line rhythm; the existing `overmindUtils.getBatteryColor` may still colour the value so a critical level reads at a glance.
4. **One time formatter for the whole dialog, `dateUtils.isoToShortDateTime`,** already used by the last-time-online line — explicitly not ISO-8601, per the change request. Failure-reason times use `isoToShortDateLongTime` (the same format plus seconds) because a retry burst records several reasons inside one minute and a minute-precision timeline would collapse them into apparent simultaneity. Both helpers append `Z` to the backend's zone-less `LocalDateTime` strings and render in the tablet's locale, which is what every other timestamp in this GUI does.
5. **Failure reasons are read through one normalizer that accepts a string or an object.** Today the endpoint sends `["connect timeout after 5s", …]`. The backend companion sends entries carrying a time, and the in-flight `fix-reconciler-gen2-and-transport-errors` additionally collapses identical consecutive reasons into one entry with an occurrence count. A single `normalizeErrorMessage(entry)` returning `{text, at, count}` — with `at`/`count` null for a plain string — absorbs all three shapes, so this view never needs to know which backend version it is talking to and no field is invented when one is missing.
6. **The separator is a `v-divider`, drawn only when a failure-reason section follows.** The view already uses `v-divider` (`KioskLights`, `KioskPlugs`, `KioskPresence`). Done nodes render no failure section at all, so the divider is bound to the same `column !== 'done'` condition the section is, which keeps a done dialog from ending on a rule with nothing under it.
7. **The attempt count moves inside the information block.** It currently sits below the info block and above the failure reasons, which puts it on the wrong side of the new divider — it is a property of the node, not of any failure. Moving it up is what makes the divider mean "facts above, failures below" instead of drawing an arbitrary line through the middle of the facts.

## Risks / Trade-offs

- [The backend companion may name its fields differently than assumed] → the normalizer is the only place field names appear; the spec constrains behaviour, not field names, so an adjustment is a one-function edit. Confirm names against a live `/reconciliation` response during implementation.
- [`fix-reconciler-gen2-and-transport-errors` lands first and reshapes `errorMessages` under this view] → Decision 5 covers exactly that shape, and the current plain-string shape stays supported, so either order works.
- [The block grows tall enough to push the actions off a 1024x600 kiosk screen] → worst case is a done node (no failure list) or an error node with five reasons; the dialog is `max-width: 500` with a scrolling card text. Verify the tallest realistic case — battery-driven error node with five timestamped reasons — on the kiosk viewport and give the card text a max height if it overflows.

## Migration Plan

Pure frontend change in one view plus two locale files; ship with the normal build. It is forward-compatible with the backend companion and backward-compatible with today's payload, so there is no ordering constraint between the two deploys. Rollback = revert the commit.
