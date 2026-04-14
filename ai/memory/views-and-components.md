---
name: views-and-components
description: Map of views/ and components/ — what each file is for, plus the kiosk/regular split and the floorplan dialog factory pattern.
---

# Views and components

## Views (one per route)

```
views/
├── About.vue            # /settings/about  — static info page
├── Appliances.vue       # /app/appliances  — list of configured appliances
├── ColorTest.vue        # /app/colortest   — palette/theme testbed
├── KioskCamera.vue      # /app/kioskcamera
├── KioskContact.vue     # /app/kioskcontact
├── KioskLights.vue      # /app/kiosklights
├── KioskMovement.vue    # /app/kioskmovement
├── KioskOverview.vue    # /app/kioskoverview  — the main kiosk dashboard
├── KioskPlugs.vue       # /app/kioskplugs
├── KioskVideo.vue       # /app/kioskvideo
├── page404.vue          # /:catchAll(.*)
├── Plans.vue            # /app/plans
├── Switches.vue         # /app/switches       (default landing page)
├── System.vue           # /app/system
├── Test.vue             # /app/test
└── WindowContacts.vue   # /app/windowContacts
```

`/` redirects to `/app/switches`.

## Components

### Regular panels (used by non-kiosk views)

- **SwitchPanel** — menu-button + trigger events (from `Switches.vue`)
- **PlanPanel** — plan toggle/display (from `Plans.vue`)
- **AppliancePanel** — appliance status (from `Appliances.vue`)
- **WindowContactPanel** — window contact open/closed/tilted
- **BatteryIndicator**, **LastTimeOnlineDisplay** — status indicators

### Kiosk panels (big-screen, wall-mounted)

All prefixed `Kiosk*.vue`:

- **KioskClockPanel**, **KioskZamgPanel** (weather)
- **KioskWasteDisposalPanel**, **KioskWatermeterPanel**
- **KioskPowerPanel** — current draw/solar/battery with gradient bars
- **KioskSwitchPanel**, **KioskTogglePanel** — trigger buttons
- **KioskVideoStreamPanel**, **VideoStream** — RTSP/HLS feeds
- **KioskPanel**, **KioskLinkPanel** — layout primitives

### Floorplan

`components/floorplan/`:

- **Floorplan.vue** — canvas + overlayed `v-icon`s positioned by `{x,y}` scaled
  to a background image. Uses a `FloorplanDialogFactory` that picks a dialog
  component based on area type.
- **dialogs/FloorplanDialogFactory.vue** — switch that renders the right
  dialog component per device type.
- **dialogs/Floorplan{Bulb,Contact,Dimmer,HT,Motion,Plug}Dialog.vue**

### Debounced input controls

`components/input/`:

- **DebouncedBrightnessSlider.vue**
- **DebouncedOnOffButton.vue**
- **DebouncedRgbwPicker.vue**
- **DebouncedBwPicker.vue**

They wrap Vuetify inputs with a `Debouncer` so that dragging a slider doesn't
hammer the REST API.

### App-chrome components

- **NavDrawer.vue** — menu tree, filters items by Keycloak role
  (`keycloakClientRoles.includes(subItem.role)`) — ⚠ undefined at runtime
- **AppBarMenu.vue** — language/theme/tooltips toggles
- **Snackbar.vue** — renders the queued snackbar messages
- **ModalLoading.vue** — full-screen spinner, shown when `gui/modalLoading` is true
- **CopyButton.vue**, **FlipCard.vue**, **TestFactory/TestLabel/TestTextField.vue**

## Conventions

- Most views/components are `<script lang="js">` or `type="js"` despite the
  project being nominally TypeScript. Services + router + store are `.ts`.
- Every list view holds: `raw: {}`, `filtered: {}`, `interval`, `debouncer`.
- Components receive data via props (`item`, `map`, `app`) and emit commands
  (`@reload`, `@click`) back up.
- Index-style SCSS: each views/ and components/ directory has an `_index.scss`
  that is imported with `@import 'index.scss'` from a `<style lang="scss">` block.
