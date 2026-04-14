---
name: kiosk-mode
description: What kiosk mode is, how it is toggled, and why there is a parallel Kiosk* set of views/components.
---

# Kiosk mode

## What it is

A full-screen "wall display" mode: no app bar, no nav drawer, only the
`<router-view>`. Intended for a tablet/TV permanently mounted somewhere
showing a dashboard.

## How it's toggled

Vuex state: `gui.kioskMode` (boolean, default `false`).

Entering:

- Any Kiosk view sets it in `mounted()`:
  ```js
  mounted () { this.kioskMode(true); this.reload() }
  ```
  where `kioskMode` is mapped from `gui/kioskMode` action.
- There is an exit button in the app bar pointing to `/app/kioskoverview` —
  so from a regular view you "enter" kiosk by clicking that icon.

Exiting:

- No explicit "exit kiosk" button. The pattern is that non-kiosk views do
  **not** re-set `kioskMode(false)` on mount, so switching to a regular
  route via URL keeps kiosk mode on. ⚠ This is a known rough edge —
  kiosk mode is sticky once entered.

## Template condition

`App.vue` hides the drawer and app bar behind `v-if="!kioskMode"`:

```html
<v-navigation-drawer v-if="!kioskMode" …>
<v-app-bar v-if="!kioskMode" …>
```

## Why parallel Kiosk* components

The regular-mode components (`SwitchPanel`, `AppliancePanel`) are designed
for dense dashboards on mobile/desktop. The kiosk variants are much larger,
use iconography + huge numbers, and often show computed/aggregated data
(e.g. `KioskPowerPanel` fuses multiple appliance readings into a single
gauge). They are not refactors of the regular panels — they are parallel
components with different layouts.

**Don't try to merge them** unless you understand both dashboards — the
designs serve different purposes.

## Kiosk data sources

- `KioskOverview.vue` has **hardcoded appliance IDs inline** (ids 12, 22,
  72, 73, 129, 131, 142, 145, …) — see `known-issues.md`. If you need to
  change which appliances show up, edit this file.
- `KioskPowerPanel` receives an enormous inline `:data="[…]"` prop from
  `KioskOverview.vue` defining gradients, icons, and appliance bindings
  per column/row.
