## 1. Edit `FloorplanDialogFactory.show()`

- [x] 1.1 In `src/components/floorplan/dialogs/FloorplanDialogFactory.vue`, replace the body of `methods.show()` (around lines 173-180) with:
  ```js
  show () {
    this.mapFqn()
    this.showAdditionalInfo = false
    this.showConfig = false
    this.showState = false
    this.dialogOpen = true
  }
  ```
  Initial dialog state is uniform: `showAdditionalInfo` is always `false` (collapsed) regardless of whether `mapFqn()` matched. The help icon expands the metadata panel post-open, identical to the mapped-FQN flow.
- [x] 1.2 Confirm `mapFqn()` is still called for its side effect (sets `this.component`). No edit to `mapFqn()` itself; do not add or remove any case in its switch.
- [x] 1.3 Confirm the template's `<component v-if="component" :is="component" :item="item" :app="app">` continues to render only when `mapFqn()` set `this.component` to a non-null value. No template edit required.

## 2. Confirm no other code path needs adjustment

- [x] 2.1 Confirm `Floorplan.vue` `areaClicked` (`Floorplan.vue:619-641`) is unchanged. It already calls `this.$refs[constructIdFrom(area)][0].show()` in detail mode — the only difference is what `show()` now does.
- [x] 2.2 Confirm `data().showAdditionalInfo`'s initial value (`false`, `FloorplanDialogFactory.vue:114`) is unchanged. Only the runtime override inside `show()` changes.
- [x] 2.3 Confirm the help-icon click handler at line 8 (`showAdditionalInfo === 0 ? showAdditionalInfo = false : showAdditionalInfo = 0`) is unchanged. Both `0` and `false` remain the only two states for that field.

## 3. Manual verification (browser, user-driven)

Build/test/deploy ownership lives with the user. The following are checks for the user to run on dev after the change is on `develop`.

- [ ] 3.1 User: open `/app/kioskplugs` in detail mode and click an appliance with a registered FQN (e.g. a Shelly plug or 3EM with `classFqn: Shelly3EmAppliance`). Confirm the dialog opens with the existing renderer and the metadata panels collapsed (must click help icon to see them) — same as before this change.
- [ ] 3.2 User: in the same view, click appliance 177 (Solax inverter, `SolaxX3G4Appliance`). Confirm the dialog opens.
- [ ] 3.3 User: confirm the unmapped-FQN dialog (177) opens with the metadata panels collapsed by default — same initial layout as the mapped 3EM dialog. The body's `<component>` slot is empty.
- [ ] 3.4 User: click the help icon to expand the metadata panels. Confirm ID, IP, last online, last setup, config JSON, state JSON all become visible. Clicking the help icon again collapses them.
- [ ] 3.5 User: close the dialog (X / overlay click), then re-open it from the avatar. Confirm the metadata panels are collapsed again on re-open (the help-icon state resets).
- [ ] 3.6 User: close a mapped-FQN dialog and re-open it. Confirm the same uniform initial layout (metadata collapsed).
- [ ] 3.7 User: with the unmapped-FQN dialog open and metadata expanded via help icon, confirm `app.state` (the inverter readings — `acPower`, `dcPower`, `battery`, etc.) is visible inside the JSON state textarea.

## 4. Cleanup and finalization

- [x] 4.1 Confirm `git diff` shows changes only in `src/components/floorplan/dialogs/FloorplanDialogFactory.vue` (one method body changed; no template edits, no new imports, no data-field additions).
- [x] 4.2 Re-read each scenario in `openspec/changes/open-detail-dialog-on-unmapped-fqn/specs/floorplan-detail-dialog/spec.md` and confirm the implementation satisfies it; manual tasks 3.1-3.7 collectively exercise the user-visible scenarios.
- [x] 4.3 Run `volta run --node 24.15.0 npx -y @fission-ai/openspec@latest validate open-detail-dialog-on-unmapped-fqn` and confirm "valid".
