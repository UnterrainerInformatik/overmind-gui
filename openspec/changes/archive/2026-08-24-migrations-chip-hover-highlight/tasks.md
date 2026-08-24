## 1. Stop the table-wide hover highlight

- [x] 1.1 Add `class="migrations-table"` to the `v-simple-table` in `src/views/KioskMigrations.vue`.
- [x] 1.2 Add `.migrations-table > .v-data-table__wrapper > table > tbody > tr:hover { background: transparent !important; }` to the view's style block.
- [x] 1.3 Verify in a browser that moving the pointer over a cell, over a gap between chips, and over the column headings leaves the table's computed background unchanged.

## 2. Highlight the hovered chip

- [x] 2.1 Switch off Vuetify's inherited chip hover overlay for node chips (`.migrations-chip.v-chip:hover::before { opacity: 0 }`) and raise it for the clickable ones (`.migrations-chip.clickable-node.v-chip:hover::before { opacity: 0.12 }`), the raise wrapped in `@media (hover: hover)`.
- [x] 2.2 Confirm the hovered chip's `::before` overlay computes to `opacity: 0.12` in `currentColor` (white on the dark theme), and that its neighbours stay at `0`.
- [x] 2.3 Confirm done chips - which carry no `clickable-node` class - stay flat under the pointer, i.e. the inherited `0.08` overlay is gone.

## 3. Verification

- [x] 3.1 At 1024x600 with kiosk mode active and mocked `GET /reconciliation` data, hover a pending chip and a done chip and screenshot both; only the pending chip changes.
- [x] 3.2 Confirm hovering an error chip highlights just that chip while its neighbours above and below stay flat.
- [x] 3.3 Confirm clicking a pending/error chip still opens the node-detail dialog, and that after closing it no chip is left highlighted.
- [x] 3.4 Confirm the three columns still scroll independently and column widths are unchanged.
- [x] 3.5 `vue-cli-service lint` passes for the changed file.
- [x] 3.6 Control check: delete the row-hover override from the live CSSOM, re-hover, and confirm the whole row goes grey again - the reported symptom, reproduced and then removed by the fix.
- [x] 3.7 Re-run the suite with the touch pointer class and confirm no chip lights up, so a tap cannot leave one latched.

## 4. Keep the harness

- [x] 4.1 Move the browser harness out of the session scratchpad to `~/.local/share/overmind-gui-verify/` so it survives, with the suite, the mock payload and a README.
