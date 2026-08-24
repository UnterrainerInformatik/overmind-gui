## Context

See proposal.md — Why. The dialog in `src/views/KioskMigrations.vue` today renders only `node.name`, `node.attemptCount` and `node.errorMessages` from the migrations status payload; that payload carries no appliance details beyond `applianceId`. Appliance records are available via `appliancesService.getById(id)` (`/setup/appliances`), whose objects carry `id`, `name`, `lastTimeOnline`, `pingable` and a `config` (with `address`; `state`/`config` arrive JSON-stringified in some responses — see `KioskWatermeterPanel.update()` parsing `app.state`).

## Goals / Non-Goals

**Goals**
- One dialog for all three columns, with an appliance-info block that degrades gracefully per missing field.
- No extra polling: appliance details are fetched once per dialog open.

**Non-Goals**
- No changes to the migrations status endpoint or its payload.
- No appliance-info caching layer; a fresh `getById` per open is fine at kiosk interaction rates.
- No changes to panel/table layout (that is `display-multiple-migrations`).

## Decisions

1. **Fetch on open, not eagerly for all nodes.** `openNodeDialog` sets `selectedNode` immediately (dialog opens with name/attempts as today) and kicks off `appliancesService.getById(node.applianceId)` into a `selectedAppliance` + `applianceLoading`/`applianceError` trio. Alternative — prefetching details for every node with the 5s poll — multiplies request volume for data rarely viewed.
2. **Guard against stale responses.** Store the requested `applianceId` and ignore a resolving fetch whose id no longer matches the open dialog (operator closed/reopened quickly).
3. **Field mapping with defensive parsing.** `config` may be an object or a JSON string — normalize with a small helper before reading. Candidate sources: ID = `applianceId`; IP = `config.address` (strip an `http://` scheme if present); MAC = `config.mac` when present; last online = `lastTimeOnline` (render via the existing `LastTimeOnlineDisplay` component or its formatting); online = `pingable`. Any field that is `null`/`undefined`/empty is skipped per spec.
4. **Done-node mode by column, not by data.** `openNodeDialog` already receives the entry and node; pass the column kind (`pending`/`done`/`error`) so the dialog hides retry + error-message sections for `done` without inferring from absent fields.
5. **Hover CSS: extend, don't restructure.** Add `clickable-node` to done chips; the existing `@media (hover: hover)` rule then covers them. The touch-latch mitigation (hover only under `hover: hover`) already handles tablets.

## Risks / Trade-offs

- [Backend appliance record may lack MAC or use a different key] → spec allows omission; verify the real field name against a live/uinf response during implementation and adjust the mapping only.
- [Race with the second open change touching the same view] → implement after `display-multiple-migrations` or rebase; the dialog block and chip handlers are disjoint from the panel wrapper, so conflicts are mechanical.
- [`getById` failure would leave a silent gap] → explicit `applianceError` state with a visible line in the dialog (spec scenario).

## Migration Plan

Pure frontend change in one view; ship with the normal build. Rollback = revert the commit.
