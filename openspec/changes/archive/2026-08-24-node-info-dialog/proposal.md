## Why

The node dialog on the Migrations Overview currently shows only the node name, its attempt count and error messages — not enough to identify or troubleshoot a device from the kiosk. Operators want the core appliance facts (ID, IP, MAC, last time online, online state) right in the dialog. Done-column chips have no click handler at all, so a finished node's details cannot be inspected.

## What Changes

- The node dialog gains an info section under its title listing the appliance's ID, IP address, MAC address, last time online, and current online state; fields the backend does not provide for a node are omitted rather than shown empty.
- The appliance details are fetched when the dialog opens (via the existing appliances endpoint, `appliancesService.getById`), with a loading and a failure state inside the dialog.
- Chips in the done column become clickable and open the same dialog; since done nodes have no errors and nothing to retry, the dialog hides the retry action and the error-message section for them.
- Done chips get the same pointer-hover highlight as the other clickable chips (they are now interactive).

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `kiosk-migrations-overview`: The "Pointer hover highlights the individual node chip" requirement changes (done chips become clickable, so they now hover-highlight too), and a new requirement covers the node detail dialog's appliance-info content and its reachability from all three columns.

## Impact

- `src/views/KioskMigrations.vue`: click handler + hover styling for done chips; dialog extended with an appliance-info block, loading/error handling, conditional retry button.
- `src/utils/webservices/appliancesService.ts`: reused as-is (`getById`).
- `src/locales/de-AT.json`, `src/locales/en-US.json`: new keys for the info labels (ID, IP, MAC, last online, online) and dialog load-failure text.
- Overlaps with the open change `display-multiple-migrations` in the same view; the dialog markup is independent of the panel restructuring, but the two changes should be implemented/merged in sequence.
