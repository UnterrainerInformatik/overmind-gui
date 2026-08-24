## Context

See `proposal.md` - Why. Traced in `src/views/KioskMigrations.vue` and Vuetify 2.5 (`vuetify@^2.5.14`) as of `3946bb9`:

- The table body is one row: `src/views/KioskMigrations.vue:38-99` renders `<tbody><tr>` with exactly three `<td class="migrations-cell">`, one per status column. Every node chip of the entry lives inside that single row.
- Vuetify's data-table theme (`node_modules/vuetify/src/components/VDataTable/VSimpleTable.sass`, compiled into `dist/vuetify.css`) emits
  `.theme--dark.v-data-table > .v-data-table__wrapper > table > tbody > tr:hover:not(.v-data-table__expanded__content):not(.v-data-table__empty-wrapper) { background: #616161; }`.
  The app runs `dark: true` (`src/plugins/vuetify.ts:82`), so the hover background is the grey the report describes. Because the entry has a single row, "the hovered row" *is* the whole table body.
- Chips do get a hover overlay, from a mixin rather than from `VChip.sass`: `node_modules/vuetify/src/styles/tools/_states.sass` emits `&:hover::before { opacity: <states.hover> }`, which for the dark theme (`_dark.scss:103`) is `0.08`. Read back off the running page, the rule is `.theme--dark.v-chip:hover::before { opacity: 0.08 }` - specificity (0,3,0), applied to *every* chip, clickable or not. Grepping `VChip.sass` for `:hover` misses it; only the compiled cascade shows it.
- An outlined chip's background cannot be set from a normal selector: Vuetify ships `.v-chip.v-chip--outlined.v-chip.v-chip { background-color: transparent !important }`, deliberately inflated to specificity (0,4,0). The pre-existing `.migrations-chip { background-color: transparent !important }` in this view loses to it and has no effect; so would any hover background rule of ordinary specificity.
- Consequences for the fix, both confirmed in the browser before settling on it: a chip highlight has to go through the `::before` overlay rather than the chip's background, and the done chips need their inherited overlay actively switched off rather than simply left alone.

## Goals / Non-Goals

**Goals:**
- Pointing at a clickable node chip highlights *that chip*.
- Pointing anywhere in a migration entry leaves the table's own background unchanged.
- Hover feedback marks what is clickable, and only what is clickable.

**Non-Goals:**
- Restructuring the table into one row per node. The single-row layout is what makes the three columns scroll independently (`2026-08-23-migrations-node-chips-scroll`); changing it to fix a hover colour would undo that.
- Changing click, retry, or detail-dialog behaviour.
- Adding hover feedback anywhere else on the page (back button, gear button, retry-all button keep Vuetify's defaults).
- Touch-specific press feedback (ripples, active states) - out of scope.

## Decisions

**1. Neutralise the row hover on this table only, with a scoping class.**
Add `class="migrations-table"` to the `v-simple-table` (the class lands on the `.v-data-table` root) and override:
`.migrations-table > .v-data-table__wrapper > table > tbody > tr:hover { background: transparent !important; }`.
Scoping to the migrations table leaves every other table in the app with Vuetify's default row hover, which is correct there - those tables have many rows, and highlighting the hovered one is the point.
*Alternative considered*: dropping `v-simple-table` for plain `<div>` columns. Rejected - it would discard the table semantics and column sizing the previous two changes deliberately built on, for a styling problem.
*Alternative considered*: overriding globally in `index.scss`. Rejected - it would silently remove a useful affordance from unrelated views.

**2. `!important` rather than out-specifying Vuetify's selector.**
The framework rule scores (0,6,3) thanks to its two trailing `:not()`s; a readable override cannot beat it without copying those `:not()`s verbatim, which couples the app's CSS to Vuetify's internal class names. `!important` is already the idiom in this file (`.migrations-chip`, `.migrations-cell`, `.noFocus`).

**3. Hover highlight goes on `.clickable-node` chips, not on all chips.**
`clickable-node` is already the marker for the chips wired to `openNodeDialog` (pending and error; done chips deliberately lack it). Keying the hover rule off the same class means the highlight can never drift out of sync with clickability. Done chips stay flat.

**4. Highlight through Vuetify's own `::before` state overlay, switched off for all node chips and raised to `0.12` for the clickable ones.**
```
.migrations-chip.v-chip:hover::before            { opacity: 0; }
@media (hover: hover) {
  .migrations-chip.clickable-node.v-chip:hover::before { opacity: 0.12; }
}
```
The overlay is `background-color: currentColor` stretched over the chip, so on the dark theme it is white - the same "light wash on dark" as the scrollbar thumb (`rgba(255, 255, 255, 0.35)`), and the exact mechanism the framework uses for `:focus` (`0.24` on dark). `0.12` sits halfway between Vuetify's own hover and focus steps: clearly visible, still quieter than focus.

Both rules are needed. The suppression covers the done chips (Decision 3) *and* the touch case, where the raise is gated out by Decision 5 but Vuetify's `0.08` would otherwise remain. `.v-chip` is repeated in the second selector so it scores (0,4,0) against the first's (0,3,0) and wins on specificity rather than on source order.

*Alternative considered*: a `background-color` on the chip. Rejected - it cannot win against Vuetify's (0,4,0) `!important` transparent rule without repeating `.v-chip` three times, and it would fight the framework instead of using it. Measured: the rule computes to `rgba(0, 0, 0, 0)` on the hovered chip.
*Alternative considered*: brightening the chip's outline instead. Rejected - a 1px border change is easy to miss at arm's length on a wall-mounted tablet.

**5. Wrap the raised chip highlight in `@media (hover: hover)`.**
On the kiosk touch tablet a tap can leave `:hover` latched on the tapped element until the next tap elsewhere, so a chip would stay highlighted after its dialog closes and read as "selected". Gating on a real pointer keeps the highlight for mouse users and leaves touch untouched. The row-hover suppression is *not* gated - the grey should never appear, on either input type.

## Risks / Trade-offs

- **[The `.v-data-table__wrapper` child selector depends on Vuetify's internal DOM]** → Mitigation: it is the same structure the framework's own rule targets, so the override cannot break without the rule it overrides breaking too; and the failure mode is cosmetic (the grey returns), not functional.
- **[`opacity: 0.12` is tuned for the dark kiosk theme]** → Mitigation: the overlay is `currentColor`, so it follows the theme's text colour automatically; only the amount is tuned, and Vuetify itself uses a lower one on light (`0.04` vs `0.08`). If a light theme is ever introduced this joins the scrollbar colours already needing revisiting.
- **[Suppressing the inherited overlay means node chips no longer match chips elsewhere in the app]** → Mitigation: intended. Everywhere else a chip's hover says "this is a chip"; here it has to say "this one opens something", which only two of the three columns do.
- **[`@media (hover: hover)` reports true for a tablet with a mouse attached]** → Mitigation: accepted - that configuration *is* a pointer device, and the highlight is correct there.

## Open Questions

None.

## Verification

Automated, in a real browser: `~/.local/share/overmind-gui-verify/suites/migrations-hover.mjs` (see that directory's README). 23 checks, all passing - five hover positions against the table row, the overlay level on hovered / neighbouring / done chips, both pointer classes, the click path, and the layout guarantees the two preceding changes established.

Two of them are worth calling out. A **control** check deletes the row-hover override from the live CSSOM and re-hovers: the row goes `rgb(97, 97, 97)`, reproducing the report exactly and proving the override is what removes it. And because headless Chrome sees no input device, it reports `hover: none` and silently drops every `@media (hover: hover)` rule - the harness pins the pointer class through blink settings at launch (`primaryHoverType` / `availableHoverTypes`), since neither `page.emulateMediaFeatures` nor CDP `Emulation.setEmulatedMedia` can override it.
