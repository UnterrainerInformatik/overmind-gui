## Context

See proposal.md — Why. `src/views/KioskMigrations.vue` renders one always-open `v-card` per entry from `GET migrations` (`response.entries`), and each entry's `.migrations-node-list` is sized with `max-height: calc(100vh - 170px)`, i.e. to the full remaining viewport. With N > 1 entries the page is N screens tall on the 1024x600 kiosk tablet. Constraints: Vue 2 + Vuetify 1.x/2.x component set already used in this repo (`v-expansion-panels` available), dark kiosk theme, touch-first, 5s status polling that replaces `entries` wholesale.

## Goals / Non-Goals

**Goals**
- Every migration discoverable on one screen via collapsed panel headers.
- The expanded migration keeps the exact current detail view (table, chips, scrolling, dialogs, retry actions) without regressions.
- Expansion state survives the 5s polling refresh.

**Non-Goals**
- No backend/API changes.
- No changes to the node dialog or retry behavior (that is the second open proposal, `useful-node-information`).
- No support for viewing two migrations' details side by side.

## Decisions

1. **`v-expansion-panels accordion` keyed by `fieldAccessorKey`.** Accordion mode guarantees at most one open body, which is what lets the open body keep sizing its node lists to "rest of the screen". Alternative — multiple open panels — would force per-panel height budgeting and reintroduce page scrolling.

2. **Track the expanded panel by `fieldAccessorKey`, not by index.** The poll replaces `entries` every 5s; an index-based `v-model` would jump to a different migration when entries reorder or disappear. Map key → index via a computed. When the tracked key vanishes (migration finished), fall back to collapsed; when exactly one entry exists and nothing is tracked yet, auto-expand it.

3. **Header content: title text + three small count badges (done/pending/error).** Reuse existing locale keys `pending`/`done`/`error` for tooltips or labels; counts come straight from `entry.*Count`. Keep the header a single line so ~5 collapsed headers plus one expanded panel still fit 600px height.

4. **Height calc moves from a viewport constant to accounting for sibling headers.** Replace `calc(100vh - 170px)` with a calc that subtracts page title + (N−1) collapsed headers + expanded header + table head. Simplest robust form: compute the pixel budget in a computed property (`entries.length` is known) and bind it as an inline `max-height` style; avoids brittle pure-CSS guesses.

5. **Keep the existing table markup untouched inside `v-expansion-panel-content`.** All chip/scrollbar/hover CSS keyed on `.migrations-*` classes continues to apply; only the wrapper changes. Vuetify's panel content adds default padding — zero it (`.v-expansion-panel-content__wrap { padding: 0 }` scoped to this view) so column widths match the current card layout.

## Risks / Trade-offs

- [Vuetify panel transition re-runs on every poll if `entries` identity churn re-renders panels] → key panels by `fieldAccessorKey` and avoid re-creating the panels array; Vue patches in place.
- [Accordion hides two migrations' details from being compared at once] → accepted; headers carry the counts, which is the at-a-glance need.
- [Height computed in JS can drift from CSS reality after theme/font changes] → verify on the 1024x600 kiosk viewport with the persistent Puppeteer harness (~/.local/share/overmind-gui-verify).

## Migration Plan

Pure frontend change in one view; ship with the normal build. Rollback = revert the commit.
