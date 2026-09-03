## Why

The timeline `EventsTimeline.vue` draws is a bare rail with one mark per event.
It answers "how are the events distributed" and nothing else: no end of the
axis is labelled, and between the two ends there is not a single graduation.
A mark two thirds of the way up is readable as *later than the others* and in
no other way — the absolute time behind it only exists in the `title`
tooltip, one mark at a time.

That gap matters because the span underneath is not fixed. The quick ranges
alone put 2 hours, 12 hours, 24 hours and 7 days on the same 100%-tall strip,
and a hand-typed range puts anything at all there. The picture looks identical
in every case, so the user has to remember which range is active to read their
own screen — and a cluster that means "a busy quarter of an hour" is drawn
exactly like one that means "a busy afternoon".

## What Changes

- **Both ends of the axis get labelled.** The bottom carries the axis start,
  the top the axis end, each as a date and a time, so the strip states the
  period it covers instead of implying it. The top end follows the clock while
  the range is open-ended, exactly as `axisEnd()` already does.
- **The axis gets graduated tick lines in two weights.** A *minor* tick marks
  each step of the chosen unit; a *major* tick — longer and heavier — marks
  each boundary of the next unit up. Inside a day that reads as short strokes
  on the hours with long strokes at midnight and noon; on a two-hour span, as
  short strokes on the minutes with long strokes on the hours; over a week, as
  short strokes on the days with long strokes on the weeks.
- **The unit follows the span, not the other way round.** The step is picked
  from a ladder of calendar-meaningful steps (minutes, quarter-hours,
  half-hours, hours, quarter-days, half-days, days, weeks, months) as the
  largest one whose ticks still land far enough apart to read, so a scale is
  never denser than legible and never so sparse it says nothing. The picked
  unit is what makes the two zoom levels above tell themselves apart at a
  glance.
- **Major ticks carry a short label** where there is room for one without
  labels colliding — `12:00` on an hour boundary, the date on a day boundary —
  thinning out to unlabelled ticks when they would crowd. The two axis-end
  labels are always shown; they are the ones that anchor the reading.
- **Tick boundaries are local calendar boundaries.** Midnight, noon, the top of
  the hour and the first of the month are found by walking local `Date` values,
  not by dividing epoch seconds — a day is not reliably 86400 seconds across a
  DST switch, and the graduation would visibly drift off the hour for half the
  year if it were.
- The scale is drawn *behind* the event marks and stays visually quieter than
  they are. The marks and their activation behaviour are untouched: the events
  remain the content, the scale is the paper it is drawn on.

## Capabilities

### New Capabilities

None. This deepens the existing timeline capability rather than adding one.

### Modified Capabilities

- `kiosk-personen-events-timeline`: the "Timeline spans the active time range"
  requirement currently ends at *the extent corresponds to the range*, with the
  position of a mark as the only thing that carries time. It gains the axis's
  own readability: labelled ends, a graduated scale in two tick weights, a step
  unit derived from the visible span, and the rule that the scale stays
  subordinate to the event marks and to the grid's usable width.

## Impact

- `src/components/EventsTimeline.vue` — the whole of the change: a computed
  scale (ticks with their weight and optional label) alongside the existing
  `marks` computed, the end labels, and the styling that keeps the scale behind
  the marks. The component stays presentational and keeps taking `axisStart` /
  `axisEnd` as it does today; no new prop is required.
- `src/views/KioskPersonenEvents.vue` — the strip's height. Its width is
  unchanged: `$events-timeline-width` stays the 56px two-place contract (the
  strip and the grid's right padding), so `TIMELINE_MIN_WIDTH = 420` still
  holds and needs no re-measuring. What does change is the foot: the strip
  stops above the fixed corner button `App.vue` parks there, which was
  harmless over bare rail and is not harmless over the label naming the axis
  start.
- `src/utils/dateUtils.ts` — the existing `dateToShortTime()` /
  `dateToDatePadded()` cover the label formats; any boundary-walking helper the
  scale needs belongs here beside `roundTimeToQuater()` rather than in the
  component.
- `src/locales/de-AT.json`, `src/locales/en-US.json` — accessible naming for
  the axis ends under the existing `page.kiosk.personenEvents` block. Tick
  labels themselves are dates and times, formatted by locale, not translated
  strings.
- No server-side, API, query or dependency changes: the scale is derived from
  the two axis bounds the component already receives.
