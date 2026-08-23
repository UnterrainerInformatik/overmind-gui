## Why

The chip rework shipped in `2026-08-23-migrations-node-chips-scroll` made the Migrations Overview unreadable on the kiosk tablet: every node chip shows its status icon but neither the node name nor the retry count. The chips were given `color="transparent"`, and Vuetify turns a chip's color prop into a text color class - `transparent--text`, i.e. `color: transparent !important` - so all chip text is painted invisible while the icons, which carry their own color classes, survive.

At the same time `v-simple-table` was never registered in the app's à-la-carte Vuetify component list, so the page never had a real table box (Vue logged `Unknown custom element: <v-simple-table>`). Without it the columns did not lay out as a table, which is why the bulk retry-all-errors button and the error column's scrollbar ended up floating to the right of the content instead of sitting inside the error column. The page also only used a 900px-wide strip of the tablet's 1024x600 screen and left the bottom band unused.

## What Changes

- Drop the `color="transparent"` prop from the pending/done/error node chips so chip text uses the theme's normal text color. `outlined` plus the existing CSS rule already keeps the background transparent.
- Register `VSimpleTable` in `src/plugins/vuetify.ts` so the overview renders as an actual table.
- Move the bulk retry-all-errors button next to the "error" column heading label instead of pushing it to the far edge of the header row.
- Lay the page out for the kiosk tablet's 1024x600 screen: full-width card, three equal-width columns, node lists sized to the remaining height so a single migration entry fits without page scroll.
- Keep each column's scrollbar inside its own column (reserved gutter) and give it a thumb color that is actually visible on the dark kiosk theme.

## Capabilities

### Modified Capabilities
- `kiosk-migrations-overview`: the per-node chip requirement gains an explicit legibility guarantee (node name and retry count must be readable, not just present in the DOM); the scroll requirement now pins the scrollbar inside the scrolling column and requires it to contrast against the dark theme; adds a requirement that the overview fills the kiosk screen with equal-width columns and that the bulk retry action lives in the error column heading.

## Impact

- `src/views/KioskMigrations.vue`: chip markup (color prop removed, chip content forced to full chip width so the count is actually right-aligned), error column heading (retry button next to the label), and the page's layout CSS (width, column widths, list heights, scrollbar).
- `src/plugins/vuetify.ts`: adds `VSimpleTable` to the à-la-carte component registration - this affects every view, but only by making a component available that was previously missing.
- No backend, route, store, or API contract changes.
