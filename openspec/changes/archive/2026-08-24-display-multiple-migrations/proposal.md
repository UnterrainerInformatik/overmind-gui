## Why

The Migrations Overview renders one full-height card per migration: each entry's node lists are sized to the whole remaining viewport (`calc(100vh - 170px)`), so with more than one active migration only the first entry is visible on the 1024x600 kiosk screen and the rest are effectively unreachable. Operators believe only one migration exists even when the backend reports several.

## What Changes

- Replace the flat stack of migration cards with one expansion panel per migration entry.
- The panel header identifies the migration (field accessor key → target value) and shows the pending/done/error counts, so collapsed migrations remain scannable.
- The expanded panel body shows exactly the current per-migration view: the three-column table (pending / done / error) with node chips, retry counts, per-column scrolling, retry-all button and node dialogs — unchanged.
- Panels behave as an accordion (one open at a time) so an open entry can keep sizing its node lists to the remaining screen height; with exactly one migration, that entry starts expanded.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `kiosk-migrations-overview`: The "Overview lists every active migration" requirement changes from a stack of always-open entries to one expansion panel per migration with an identifying, count-bearing header; layout requirements ("fills the kiosk screen") are restated in terms of the single expanded panel.

## Impact

- `src/views/KioskMigrations.vue`: wrap the per-entry card in `v-expansion-panels`/`v-expansion-panel`, move the entry title and counts into the panel header, keep the table as the panel content; adjust the node-list height calc for the added header rows.
- `src/locales/de-AT.json`, `src/locales/en-US.json`: possible new keys for count labels in the panel header.
- No backend/API change: `GET migrations` already returns `entries[]`; the GUI already iterates it. (If the backend ever returns only one entry despite multiple DB rows, that is a backend issue outside this repo.)
