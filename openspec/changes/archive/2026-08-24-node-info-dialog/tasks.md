## 1. Data fetch

- [x] 1.1 In `src/views/KioskMigrations.vue`, extend `openNodeDialog` to fetch `appliancesService.getById(node.applianceId)` into `selectedAppliance` with `applianceLoading`/`applianceError` state and a stale-response guard; verify via dev server that opening a dialog logs/receives the appliance record and rapid close/reopen never shows another node's data
- [x] 1.2 Add a normalization helper that tolerates JSON-stringified `config`/`state` and maps ID, IP (`config.address`, scheme stripped), MAC (if present), `lastTimeOnline`, and online (`pingable`); verify with unit-style checks or manual mocks covering object vs. string config and missing fields

## 2. Dialog UI

- [x] 2.1 Render the info section under the dialog title as labeled lines, omitting unavailable fields, with a loading indicator and a failure line on fetch error; verify all three states (loading, loaded, failed) in the browser with mocked responses
- [x] 2.2 Add locale keys (de-AT, en-US) for ID/IP/MAC/last online/online labels and the load-failure text; verify both locales render and `npm run lint` passes
- [x] 2.3 Pass the column kind into the dialog and hide retry action and error-message section for done nodes; verify a done-node dialog shows only title + info section while pending/error dialogs keep attempts, messages and retry

## 3. Done-chip interactivity

- [x] 3.1 Add the click handler and `clickable-node` class to done-column chips; verify clicking a done chip opens the dialog and hover highlights the chip on a mouse pointer but leaves no latched highlight after touch (Puppeteer harness at ~/.local/share/overmind-gui-verify, computed-style checks)

## 4. Verification

- [x] 4.1 Full scenario pass on the 1024x600 kiosk viewport: dialogs from all three columns, missing-field omission, fetch-failure state, retry still works from pending/error dialogs; capture screenshots via the harness
- [x] 4.2 Run lint/build and verify both pass
