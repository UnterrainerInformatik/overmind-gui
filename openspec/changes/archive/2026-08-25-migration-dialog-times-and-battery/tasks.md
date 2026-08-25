## 1. Battery in the information block

- [x] 1.1 In `src/views/KioskMigrations.vue`, extend `normalizeAppliance` to read `batteryDriven` from the appliance record and the charge level from the parsed `state` (`batteries[0].batteryLevel`, 0..1) into `batteryDriven` / `batteryPercent` (rounded to whole percent), each null when unavailable; verify with mocked records covering a battery-driven sensor with a level, a battery-driven sensor whose `state` holds no `batteries` entry, a mains-powered appliance, and a `state` arriving as a JSON string rather than an object
- [x] 1.2 Render the battery line in the info block — level as a percentage, with no timestamp of its own — shown only when `batteryDriven` is true and a level is present; verify in the browser against all four mocked records from 1.1 that exactly the intended line appears and that no time is repeated from the last-time-online line
- [x] 1.3 Colour the percentage via `overmindUtils.getBatteryColor` so a critical level reads at a glance, and verify the computed colour on the kiosk theme with the Puppeteer harness at `~/.local/share/overmind-gui-verify` (computed style, not source grep)

## 2. Times in the dialog

- [x] 2.1 Render the done-node migration time as a labeled line in the info block using `dateUtils.isoToShortDateTime`, omitted when the backend supplies none; verify a done-node dialog against both a payload carrying the time and today's payload without it
- [x] 2.2 Add a `normalizeErrorMessage(entry)` helper returning `{text, at, count}` that accepts a plain string, a timestamped object, and a collapsed entry with an occurrence count; verify with unit-style checks over all three shapes plus a null/empty entry
- [x] 2.3 Render each failure reason through that helper with `dateUtils.isoToShortDateLongTime` (seconds included), omitting the time for entries that carry none and showing the occurrence count when present; verify an error-node dialog renders today's plain-string payload unchanged and a mocked timestamped payload as a timeline
- [x] 2.4 Confirm no ISO-8601 string is rendered anywhere in the dialog — grep the template for raw timestamp interpolation and verify visually that every time goes through a `dateUtils` helper

## 3. Block separation

- [x] 3.1 Move the attempt-count line from below the info block into it, above the divider; verify a pending and an error dialog show the attempt count grouped with the appliance facts
- [x] 3.2 Add a `v-divider` between the information block and the failure-reason section, bound to the same condition as that section; verify an error dialog shows the rule, a pending dialog with no recorded reasons shows the rule above the "no failure reasons" text, and a done dialog shows no dangling rule

## 4. Localization

- [x] 4.1 Add de-AT and en-US keys for the battery label and the migration-time label; verify both locales render every new line with no missing-key fallbacks and that `npm run lint` passes

## 5. Verification

- [x] 5.1 Full scenario pass on the 1024x600 kiosk viewport covering every spec scenario: battery-driven with a level, battery-driven without a level, mains-powered, done node with and without a migration time, error node with timestamped and with plain-string reasons, appliance-info load failure; capture screenshots via the harness
- [x] 5.2 Verify the tallest realistic dialog (battery-driven error node, five timestamped reasons) keeps its actions reachable on 1024x600, adding a max height with scroll to the card text only if it overflows
- [x] 5.3 Run lint and build and verify both pass
