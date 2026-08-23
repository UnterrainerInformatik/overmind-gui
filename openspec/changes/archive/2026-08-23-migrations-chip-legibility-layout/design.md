## Context

See `proposal.md` - Why. Verified in a headless Chrome (Puppeteer, viewport 1024x600, kiosk mode on, `GET /reconciliation` mocked) against `src/views/KioskMigrations.vue` as of `22feb97`:

- The computed style of a node chip was `color: rgba(0, 0, 0, 0)`; its class list contained `transparent transparent--text`. Vuetify 2 emits `<color>--text` for a chip's color prop, and `vuetify.css` defines `.v-application .transparent--text { color: transparent !important; }`. The icons kept their own `info--text` / `success--text` / `error--text` classes and stayed visible - exactly the reported symptom.
- The page logged `[Vue warn]: Unknown custom element: <v-simple-table>`. `src/plugins/vuetify.ts` registers components à la carte and never listed `VSimpleTable`, so the element rendered as an unknown inline element wrapping `<thead>`/`<tbody>`, i.e. an anonymous, shrink-to-fit table box rather than the intended layout.
- `.v-chip__content` is shrink-to-fit, so `.migrations-chip-content { width: 100% }` resolved against a box only as wide as its own text: the measured chip was 290px wide while its content box was 124px, which is why the "right-aligned" retry count sat glued to the node name.
- `.migrations-list` was capped at `max-width: 900px` with `padding-bottom: 96px`, leaving roughly a quarter of the tablet's width and the whole bottom band unused.

## Goals / Non-Goals

**Goals:**
- Node name and retry count are legible on the kiosk tablet's dark theme.
- The three columns lay out as a real table, equally wide, filling the 1024x600 screen; one migration entry fits without page-level scrolling.
- The bulk retry action and each column's scrollbar sit inside the error column, not beside the table.

**Non-Goals:**
- Changing what the page fetches, how often it refreshes, or the detail-dialog / retry semantics.
- Making multiple migration entries fit on one screen - with more than one entry the page scrolls, as before.
- Reworking kiosk navigation (the fixed back button and the gear button stay where they are).

## Decisions

**1. Remove `color="transparent"` rather than overriding the text color.**
The previous change set the prop to state the intent "transparent background" explicitly, but in Vuetify 2 the chip color prop drives both background and text color. `outlined` already yields a transparent background, and `.migrations-chip { background-color: transparent !important }` (kept from the previous change) pins it regardless of theme. Dropping the prop restores the theme's text color for the whole chip.
*Alternative considered*: keeping the prop and adding a `color: inherit !important` override for `.migrations-chip` - rejected as fighting the framework to restore what the framework does by default.

**2. Register `VSimpleTable` in the à-la-carte list instead of switching to plain `<table>` markup.**
The template was written against `v-simple-table` and the rest of the app uses Vuetify components throughout; the missing registration is a plain omission, not a design choice. Registering it also fixes the misplaced retry button and scrollbar as a side effect, because both were symptoms of there being no table box.
*Alternative considered*: replacing `v-simple-table` with a raw `<table class="v-data-table">` - rejected: more markup, and it would drift from Vuetify's theming.

**3. Retry-all-errors button sits directly next to the "error" label (`ml-2`), not at the column's far edge.**
`justify-space-between` in the header cell pushed the button to the right edge of the header, which - once the columns became equally wide - reads as a button floating outside the content. Placing it next to the label ties it visually to the column it acts on.

**4. Column widths fixed at 33.33% each; the card spans the full viewport width.**
Table auto-layout sized columns by content, so a migration with long pending names and no errors produced lopsided columns that shifted between refreshes. Equal thirds keep the layout stable while data changes, and full width uses the tablet's 1024px instead of 900px.

**5. Node lists get `max-height: calc(100vh - 170px)`, and only the first column reserves room for the fixed back button.**
170px covers the page title, card title and table head; at 600px viewport height this leaves ~430px of list. The back button is `position: fixed` over the bottom-left corner and therefore only overlaps the first column, so instead of padding the whole page (the previous `padding-bottom: 96px`, which cost all three columns the same band) the first column's list carries `padding-bottom: 90px` inside its own scroll area - its last entries can still be scrolled clear of the button.
*Alternative considered*: moving the back button out of the content area entirely - rejected as out of scope; it is deliberately placed away from the bottom-right gear button.

**6. Scrollbar: `scrollbar-gutter: stable` plus the standard `scrollbar-width`/`scrollbar-color` properties alongside the existing `::-webkit-scrollbar` rules, with a light thumb.**
The reserved gutter keeps the bar inside its column and stops the chips from resizing when a list starts overflowing. The previous thumb color `rgba(0, 0, 0, 0.3)` was near-invisible on the dark kiosk theme; `rgba(255, 255, 255, 0.35)` reads on it. The standard properties are honored by current Chrome and by Firefox, so the styling no longer depends on the WebKit-prefixed rules alone.

## Risks / Trade-offs

- **[`calc(100vh - 170px)` is tuned for the 1024x600 kiosk tablet]** → Mitigation: it is viewport-relative, so it degrades gracefully on other sizes; on a taller screen the lists simply get taller, on a shorter one they scroll sooner.
- **[Registering `VSimpleTable` globally grows the bundle slightly for every view]** → Mitigation: one Vuetify component; the page is unusable without it.
- **[With more than one migration entry the page still scrolls at 1024x600]** → Mitigation: accepted, and unchanged from before; page-level scroll works, and each entry's columns stay independently scrollable.
- **[Verification was done in headless Chrome with mocked data, not on the physical tablet]** → Mitigation: viewport and kiosk mode were emulated at the target 1024x600; the remaining device-specific unknown is only how the browser paints the scrollbar thumb.

## Open Questions

None.
