## 1. Panel structure

- [x] 1.1 In `src/views/KioskMigrations.vue`, wrap each migration entry in `v-expansion-panels accordion` / `v-expansion-panel` keyed by `fieldAccessorKey`, moving the entry title into the panel header and the existing table into the panel content; verify the page renders one panel per entry and the table looks unchanged when expanded (dev server, mocked multi-entry response)
- [x] 1.2 Add done/pending/error counts to each panel header; verify a collapsed header shows title and all three counts on one line at 1024px width
- [x] 1.3 Track the expanded panel by `fieldAccessorKey` via a computed proxy for the panels' `v-model`; verify the same migration stays expanded across two 5s polls when the entries array is replaced, including when entry order changes
- [x] 1.4 Auto-expand when exactly one migration exists, collapse gracefully when the tracked migration disappears; verify by mocking a one-entry response and by removing the expanded entry from the mock

## 2. Layout & styling

- [x] 2.1 Zero the `v-expansion-panel-content__wrap` padding for this view and confirm the three columns stay equally wide, full width; verify column widths match the pre-change layout on the 1024x600 viewport
- [x] 2.2 Replace the `calc(100vh - 170px)` node-list height with a computed budget that subtracts page title, collapsed headers and expanded header/table head; verify with several entries that the expanded panel fits 1024x600 with no page scroll and node lists scroll internally
- [x] 2.3 Confirm back-button clearance (first column bottom padding) and dark-theme scrollbar/hover behavior still hold inside the panel; verify via the Puppeteer harness at ~/.local/share/overmind-gui-verify with computed-style checks

## 3. Verification

- [x] 3.1 Run the full scenario pass on the 1024x600 kiosk viewport: multiple migrations all headers visible, accordion switching, single migration auto-expanded, empty state, fetch-error state; capture screenshots via the harness
- [x] 3.2 Run lint/build (`npm run lint`, `npm run build` or the project's equivalents) and verify both pass
