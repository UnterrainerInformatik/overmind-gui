## 1. Restore chip legibility

- [x] 1.1 Remove `color="transparent"` from the pending, done, and error node chips in `src/views/KioskMigrations.vue`.
- [x] 1.2 Force `.migrations-chip .v-chip__content` to full chip width so the retry count is actually right-aligned instead of trailing the node name.
- [x] 1.3 Verify in a browser that a chip's computed text color is the theme text color (not `rgba(0, 0, 0, 0)`) and that name and count are both rendered.

## 2. Make the table a table

- [x] 2.1 Add `VSimpleTable` to the à-la-carte component registration in `src/plugins/vuetify.ts`.
- [x] 2.2 Confirm the `Unknown custom element: <v-simple-table>` warning is gone from the console.
- [x] 2.3 Give the three header cells a shared `migrations-col` class fixed at 33.33% width.

## 3. Layout for 1024x600

- [x] 3.1 Move the retry-all-errors button next to the "error" heading label (`d-flex align-center`, `ml-2`) instead of `justify-space-between`.
- [x] 3.2 Drop `.migrations-list`'s `max-width: 900px` / `padding-bottom: 96px` so the card spans the full viewport width.
- [x] 3.3 Set the node lists to `max-height: calc(100vh - 170px)` and give the first column's list `padding-bottom: 90px` for the fixed back button.
- [x] 3.4 Add `scrollbar-gutter: stable`, `scrollbar-width: thin` and `scrollbar-color`, and change the `::-webkit-scrollbar-thumb` color to a light translucent white.

## 4. Verification

- [x] 4.1 Screenshot the page at 1024x600 with kiosk mode active and confirm node names and right-aligned retry counts are readable in all three columns.
- [x] 4.2 Confirm a single migration entry does not make the page scroll (`document.scrollHeight === 600`) and that the bottom band is only occupied by the fixed back button.
- [x] 4.3 Confirm an overflowing error column scrolls within its own column and the retry button sits next to the "error" label.
- [x] 4.4 Confirm tapping a pending/error chip still opens the node-detail dialog with attempts and error messages.
- [x] 4.5 `vue-cli-service lint` passes for the changed files.
