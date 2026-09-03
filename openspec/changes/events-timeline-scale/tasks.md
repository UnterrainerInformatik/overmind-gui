## 1. Calendar boundary walking in `dateUtils`

- [x] 1.1 Add a boundary generator to `src/utils/dateUtils.ts` (beside
  `roundTimeToQuater()`) taking a unit — `second`, `minute`, `hour`, `day`,
  `week`, `month`, `year` — a step count, and a range in epoch seconds, and
  returning the local boundaries inside that range as epoch seconds; snap with
  the local setters (`setSeconds(0,0)`, `setMinutes`, `setHours(0,0,0,0)`,
  `setDate(1)`, `setMonth(0,1)`) and advance with the matching setter, never by
  adding milliseconds. Verify against a hand-built range in the current
  timezone that the first boundary returned is the first one at or after the
  range start and the last is the last one at or before its end
- [x] 1.2 Verify the DST cases explicitly, since they are the reason this
  helper exists rather than a modulo: over the Austrian spring-forward and
  autumn-back Sundays, the `day` boundaries land on local midnight (a
  `new Date(epoch * 1000).getHours() === 0` read-back) and the `hour`
  boundaries all read `getMinutes() === 0`; confirm that the same range walked
  by adding 86400000 does *not* — this is the assertion that shows the helper
  is earning its place
- [x] 1.3 Verify `week` starts on the same weekday `getWeek()`'s existing
  `dowOffset = 1` implies (Monday), and that `month` boundaries are correct
  across a 28-, 30- and 31-day month
- [x] 1.4 Verify the generator is bounded: a range of several centuries asked
  for in `minute` steps returns at the cap rather than looping, and returns
  an empty list for a range that contains no boundary at all

## 2. Scale derivation in `EventsTimeline.vue`

- [x] 2.1 Add the ladder of `(minor, major)` unit pairs from design.md as a
  module-level constant with the pairing rationale in a comment, and a
  selector that returns the finest rung clearing both of design.md's floors on
  the current axis height — minor spacing at least `MIN_TICK_PX` (≈8px), major
  spacing at least `MIN_MAJOR_SHARE` (⅓) of the axis — falling back to the
  coarsest rung when none qualifies. Verify by unit-checking the selector's
  output for the four quick ranges at a 900px height: 2h → `5min/1h`,
  12h → `1h/12h`, 24h → `1h/12h`, 7d → `1d/1week`, and that those hold at
  600px and 1400px too, the major floor being a share rather than a pixel
  count
- [x] 2.2 Measure the axis height into a data property from the component's own
  `clientHeight` on `mounted()` and on `window` resize (listener removed in
  `beforeDestroy()`), defaulting to 800 before the first measurement. Verify
  that the measurement reaches the scale — resizing re-renders it — and that
  height reaches the rung only through the minor floor, as design.md's second
  rationale says it should: a 24h range graduates coarser on a strip too short
  to carry hour ticks 8px apart, and is unchanged across the ordinary window
  heights above that
- [x] 2.3 Add a `scale` computed returning the ticks to draw — each with its
  `top` percentage, its weight (minor/major) and, for majors, the moment it
  marks — built from the selected rung and the boundary generator, with minor
  boundaries that coincide with a major dropped so each position is drawn once
  as a major. Verify with a range straddling a month boundary mid-week on the
  `1week/1month` rung that the month boundary appears exactly once and as a
  major
- [x] 2.4 Verify the computed is safe at the edges the axis actually reaches:
  the collapsed one-second axis the existing `marks` computed guards against
  produces a handful of ticks and no error, and an unbounded multi-year range
  produces a sparse year graduation rather than hanging

## 3. Rendering the scale

- [x] 3.1 Re-lay the strip's insides into a text lane and a graphic lane
  within the unchanged `$events-timeline-width: 56px` — rail moved into the
  right third, ticks and marks in the graphic lane, all text in the text lane;
  re-anchor `.events-timeline-mark::before` (and its active modifier) around
  the rail's new position. Verify with the harness that the mark bar's box
  still sits centred on the rail and that activation still highlights the
  right tile
- [x] 3.2 Render minor and major ticks with distinct length *and* weight, at
  opacities below the marks', from `currentColor` as the rail already does.
  Verify through `getComputedStyle` (not the stylesheet — Vuetify's cascade)
  that a major tick is measurably longer and heavier than a minor one, and
  that both are lighter than a mark
- [x] 3.3 Make the scale non-interactive: no `tabindex`, no handlers,
  `pointer-events: none`, below the marks in stacking order. Verify that
  tabbing through the page never lands on a tick, and that a click at a
  position where a mark and a tick coincide activates the mark
- [x] 3.4 Render the two axis-end labels in the text lane, date over time,
  built from `dateUtils` formatters with `this.$i18n.locale`, and shown even
  when the list is empty. The lane is 30px wide and a padded date measures
  ~50px at 10px, so the *year* does not go on the strip: the visible date is
  day and month and the full padded moment rides in the label's `title` and
  accessible name instead. Keep the 56px strip rather than taking design.md's
  widening escape hatch for this. Verify in the
  running app that they name the active range's bounds, that they change with
  the range, and that with an open upper bound the top label advances with the
  clock across the 5s refresh rather than staying at the load time
- [x] 3.5 Label major ticks in the text lane with the moment they mark — time
  of day for sub-day boundaries, short date for day and larger — applying the
  `MIN_LABEL_PX` (≈22px) thinning rule against the previously placed label and
  against both end labels, keeping the tick drawn when its label is dropped.
  Verify no two labels overlap on any of the four quick ranges and that no
  label overlaps an end label

## 4. Language and locale

- [x] 4.1 Add the accessible naming the new elements need under
  `page.kiosk.personenEvents` in both `src/locales/de-AT.json` and
  `src/locales/en-US.json` (axis start/end labels), keeping the keys
  alphabetical as the block already is; verify both files stay valid JSON and
  that no key exists in one file and not the other
- [x] 4.2 Verify the labels follow the active locale: switching between
  `de-AT` and `en-US` changes the date and time formatting of both end labels
  and the tick labels, with no hard-coded format left in the component

## 5. Verification in the running app

- [x] 5.1 Extend the existing `events-timeline` suite in the browser
  verification harness (`~/.local/share/overmind-gui-verify/suites/`) rather
  than adding a second one: assert the end labels are present and non-empty,
  that a 2h range and a 7d range produce measurably different tick counts and
  spacings, and that ticks fall at the pixel positions the mocked range's local
  hour and day boundaries imply
- [x] 5.2 Verify the timeline still gives way on a narrow viewport and the page
  does not scroll horizontally at any supported width — the strip's width is
  unchanged, so `TIMELINE_MIN_WIDTH = 420` must still hold; if the strip's
  width was changed after all, re-measure the threshold the way its comment in
  `KioskPersonenEvents.vue` documents and update both the constant and the
  comment
- [x] 5.3 Verify the whole reading end to end in the app: with each quick range
  in turn, the graduation visibly differs between them, the ends state the
  period, and the event marks are still the most prominent thing on the strip
