## Context

`FloorplanDialogFactory.vue` is rendered inside Floorplan for every area in `getAreasWithIcon()` — i.e. once per clickable appliance avatar. Its `show()` method is the entry point for opening the per-appliance detail dialog from a click. Today:

```js
show () {
  if (this.mapFqn()) {
    this.showAdditionalInfo = false
    this.showConfig = false
    this.showState = false
    this.dialogOpen = true
  }
}
```

`mapFqn()` is a switch on `app.classFqn` that selects an inner component (e.g. `FloorplanPlugDialog`) and returns `true`. If the FQN doesn't match any case, `mapFqn()` sets `this.component = null` and returns `false` — and `show()` silently returns without opening the dialog.

The dialog body has two distinct parts:
1. The vendor-specific renderer: `<component v-if="component" :is="component" :item="item" :app="app">` — only rendered when `mapFqn()` set `this.component`.
2. The metadata expansion panels (ID, IP, last online, last setup, temperature, last on/off edge, config JSON, state JSON), all gated by `v-if="showAdditionalInfo === 0"` — toggled by the help-icon button (`showAdditionalInfo === 0 ? false : 0`).

The metadata panels work for any appliance because they read generic fields (`app.id`, `app.config`, `app.state`, `app.lastTimeOnline`, `app.lastTimeSetup`). They don't need a vendor-specific component.

The trap: when `mapFqn()` returns false, the silent return in `show()` means the user gets no feedback. The dialog has the building blocks to display *something* meaningful (the metadata panels), but they never render because `dialogOpen` stays false.

Concrete trigger: appliance 177 (`Solax X3-G4-15 Inverter`, `classFqn: SolaxX3G4Appliance`, `usageType: PLUG`, `iconPos: 445,400`). It passes KioskPlugs's `applianceTypeFilter=['PLUG']`, renders an avatar, but `mapFqn()` rejects its FQN. Click → no dialog. The user has no way to tell whether the click registered, whether the appliance is misconfigured, or whether something else is wrong.

## Goals / Non-Goals

**Goals:**
- A click on any visible appliance avatar in detail mode SHALL open a dialog. No silent failure paths.
- Initial dialog layout SHALL be identical for mapped and unmapped appliances: metadata panels collapsed, help icon toggles them. The only difference is whether the renderer slot in the dialog body has content (mapped) or is empty (unmapped).
- For appliances without a registered renderer, the metadata is reachable in one click of the help icon — same affordance as for mapped appliances. An admin can diagnose "this appliance isn't fully wired up" from the GUI alone with one extra click, without DevTools or backend access.

**Non-Goals:**
- Adding `SolaxX3G4Appliance` (or any other class) to `mapFqn()`. That's a separate, additive change that can land later when a specialised renderer is worth building.
- Building a new `FloorplanInverterDialog` component. Out of scope here.
- Changing the dialog's visual layout, the metadata panels' contents, or how the help-icon toggle works.
- Adding any logging, telemetry, or analytics around silently-mapped vs unmapped FQNs.
- Changing `Floorplan.vue`'s click flow, the area filter, the SSE selection, or any data-flow concern.

## Decisions

### D1: `show()` always sets `dialogOpen = true`

The fix is essentially one-line: stop gating `dialogOpen = true` on `mapFqn()`'s return value. Always open the dialog. Continue calling `mapFqn()` for its side effect of setting `this.component`.

```js
show () {
  this.mapFqn()
  this.showAdditionalInfo = false
  this.showConfig = false
  this.showState = false
  this.dialogOpen = true
}
```

`mapFqn()` retains its current side effect: when no case matches it sets `this.component = null` and returns false. `<component v-if="component" ...>` then renders nothing. The dialog body's renderer slot is empty; the metadata expansion panels are present in the dialog (collapsed) and openable via the help-icon toggle exactly as for mapped appliances.

**Alternatives considered:**
- *Keep silent fail; emit a `console.warn` from `show()` when `mapFqn()` returns false.* Half-measure: the user still doesn't see anything. Doesn't fix the UX trap, just makes it slightly more diagnosable for developers.
- *Make `show()` show a "this appliance has no specialised renderer" message in the dialog body.* Marginal value over the metadata panels, which already tell the user what they need to know. Adds a non-trivial template branch for a fallback that's expected to be temporary.
- *Map all unknown FQNs to `FloorplanPlugDialog` as a fallback.* Wrong: it'd render `<DebouncedOnOffButton>` which expects `state.relays[0]` and the appliance to be switchable. Empty-but-broken is worse than empty-by-design.

### D2: Initial metadata-panel state is uniform across mapped and unmapped FQNs

The metadata panels (`v-expansion-panels` blocks gated by `v-if="showAdditionalInfo === 0"`) start collapsed today. The help-icon toggle uses `showAdditionalInfo === 0 ? false : 0`. So `0` ≡ open, `false` ≡ closed.

`show()` sets `showAdditionalInfo = false` regardless of whether `mapFqn()` matched. The initial dialog presentation is identical for every appliance: collapsed metadata, help icon to expand. The only difference is what's rendered inside the body's `<component>` slot — content for mapped appliances, empty for unmapped. The help-icon toggle continues to work in either case.

This is a deliberate design choice for *consistency*: a user opening a dialog should always see the same affordance set, so the experience doesn't subtly change based on whether the FQN happens to be in the switch. If the user wants the metadata, the help icon is one click away — same as for the 3EM, plug, etc.

**Alternatives considered:**
- *Auto-expand the metadata panel when `mapFqn()` returns false.* Considered and rejected: it makes the unmapped-FQN dialog visually distinct from every other dialog, which is more confusing than helpful. Users learn one set of affordances; the help-icon contract should be uniform.
- *Show a "no renderer registered" placeholder in the empty body.* Adds a template branch for a transient state. The metadata-panel-via-help-icon is sufficient.

### D3: No change to `mapFqn()` and no new vendor renderer in this change

Keep scope tight: this change is exclusively about the silent-fail contract. Adding `SolaxX3G4Appliance` to the switch (or any other vendor class) is additive and doesn't depend on this change. A future PR can add specialised renderers when they earn their keep; this fix gives every unmapped class a usable dialog in the meantime.

**Alternatives considered:**
- *Bundle a Solax mapping with this fix.* Would tie the silent-fail fix to the Solax design choices (which renderer to map to, what fields to surface). Unnecessary coupling. Two small changes are easier to review and revert independently.

## Risks / Trade-offs

- **[Trade-off] An empty body for unmapped FQNs is unobvious until the user clicks the help icon to see metadata.**
  → Acceptable: the dialog title (`app.name`) and the help-icon affordance are present immediately. The user gets the feedback that the click registered (dialog opened). A specialised renderer can be added later when one is worth building. The user-facing contract is uniform with every other dialog.

- **[Risk] Changing `show()`'s logic could conflict with future state-machine extensions on `showAdditionalInfo`.**
  → `showAdditionalInfo` is a two-state field today (`false`, `0`) used only in `show()` and the help-icon click handler. This change keeps it two-state; no new third state introduced.

## Migration Plan

Single PR. No persistent state, no migrations, no backend changes. Rollback is reverting the PR; no data shape consequences.

## Open Questions

- Whether to also expose `app.classFqn` directly as a labeled field in the metadata panel (rather than only inside the JSON state/config blobs). Trivial follow-up; out of scope here.
- Whether the auto-opened metadata panel should also auto-expand the config and state subpanels (they default to closed). Going with "expand the wrapping `showAdditionalInfo` panel only" — the user toggles config/state if they want them. Keeps the unmapped-dialog feel similar to the mapped-with-help-icon-clicked feel.
