# floorplan-detail-dialog Specification

## Purpose
TBD - created by archiving change open-detail-dialog-on-unmapped-fqn. Update Purpose after archive.
## Requirements
### Requirement: Detail dialog opens on every avatar click in detail mode

When an appliance avatar is clicked on the Floorplan with `displayEnhancedDialog === true` (detail mode), the click MUST cause `FloorplanDialogFactory.show()` to set `dialogOpen = true`. The dialog SHALL open regardless of whether `mapFqn()` finds a registered renderer for the appliance's `classFqn`. There MUST NOT exist any silent-return path inside `show()` that leaves `dialogOpen` at `false`.

`mapFqn()`'s return value SHALL still be used to decide what renders inside the dialog body (see the next requirement) — but it MUST NOT gate whether the dialog opens at all.

#### Scenario: Mapped FQN — dialog opens with vendor-specific renderer

- **WHEN** an appliance whose `classFqn` matches a case in `FloorplanDialogFactory.mapFqn()` is clicked in detail mode
- **THEN** `dialogOpen` becomes `true` and the dialog opens
- **AND** the registered renderer (e.g. `FloorplanPlugDialog` for `Shelly3EmAppliance`) is rendered inside the `<component>` slot of the dialog body
- **AND** the click flow matches today's behavior bit-for-bit aside from the implementation of `show()`

#### Scenario: Unmapped FQN — dialog still opens

- **WHEN** an appliance whose `classFqn` does not match any case in `FloorplanDialogFactory.mapFqn()` is clicked in detail mode (e.g. `info.unterrainer.server.overmindserver.vendors.solax.SolaxX3G4Appliance`)
- **THEN** `dialogOpen` becomes `true` and the dialog opens
- **AND** the `<component>` slot in the dialog body is empty (because `this.component === null`)
- **AND** the dialog title (`app.name`) and help icon are visible
- **AND** the metadata expansion panels remain collapsed by default — same as for mapped appliances — and are reachable in one click of the help icon

#### Scenario: No silent failure for any clickable appliance

- **WHEN** any appliance avatar that the Floorplan rendered is clicked in detail mode
- **THEN** the dialog opens and presents content (either a renderer or the metadata panels)
- **AND** clicking never produces a no-op outcome where the user sees no feedback at all

### Requirement: Initial dialog presentation is uniform across mapped and unmapped FQNs

When `FloorplanDialogFactory.show()` is called, the initial values of the dialog's reactive state fields SHALL be:

- `showAdditionalInfo = false` — metadata panels collapsed.
- `showConfig = false` and `showState = false` — config and state subpanels collapsed.
- `dialogOpen = true` — dialog opens.

These initial values SHALL apply uniformly regardless of whether `mapFqn()` returned `true` or `false`. The user experience MUST NOT branch on FQN-mapping at the initial-state level. The only difference between a mapped and an unmapped dialog SHALL be whether the body's `<component>` slot has content (mapped) or is empty (unmapped).

The help-icon toggle continues to switch `showAdditionalInfo` between `0` (panels open) and `false` (panels closed), letting the user expand the metadata after the dialog is already open. This affordance is identical for mapped and unmapped FQNs.

#### Scenario: Both mapped and unmapped FQN dialogs start with metadata collapsed

- **WHEN** the dialog opens for any appliance, regardless of whether `classFqn` matches a case in `mapFqn()`
- **THEN** `showAdditionalInfo === false` (metadata panels collapsed)
- **AND** `showConfig === false` and `showState === false`
- **AND** the user must click the help icon to expand the metadata panels

#### Scenario: Help-icon toggle works identically for mapped and unmapped FQNs

- **WHEN** the dialog is open (mapped or unmapped FQN) and the user clicks the help icon
- **THEN** the metadata panels expand (`showAdditionalInfo === 0`)
- **AND** clicking the help icon again collapses them (`showAdditionalInfo === false`)
- **AND** the toggle behavior is identical for both FQN classes — no branch on mapping

#### Scenario: Re-opening the dialog resets the metadata state

- **WHEN** the dialog has been opened, closed, and re-opened for any appliance (mapped or unmapped)
- **THEN** the metadata panels are collapsed again on the new open
- **AND** the help-icon toggle still works as before

### Requirement: `mapFqn()` is unchanged in this capability

This capability MUST NOT add, remove, or rename any case in `FloorplanDialogFactory.mapFqn()`. Adding a vendor-specific renderer for any new `classFqn` is an additive concern that lives outside this capability. The fix described here is solely about how `show()` handles `mapFqn()`'s `false` return.

#### Scenario: No new FQN mapping is bundled with the silent-fail fix

- **WHEN** this change is implemented
- **THEN** `mapFqn()`'s switch statement contains the same set of cases as before the change
- **AND** no new case is added for `SolaxX3G4Appliance` or any other class as part of this change
- **AND** a future change can add such a case without modifying any requirement in this capability

