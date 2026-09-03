## Context

See `proposal.md` — Why. What shapes the approach is what `EventsTimeline.vue`
and its host already are:

- **The component is presentational and gets two numbers.** `axisStart` and
  `axisEnd` are epoch seconds; everything on the strip is a share of the span
  between them. A scale needs nothing else — no new prop, no data of its own.
- **The upper bound moves.** `KioskPersonenEvents.axisEnd()` is deliberately a
  *method* returning `Date.now()` when the range is open, so the axis follows
  the clock as the view re-renders (the 5s refresh re-renders it). Anything
  derived from the bounds is therefore recomputed several times a minute and
  must be cheap and stable — a scale that reshuffles its step every tick would
  be visible as flicker.
- **The strip's width is a measured contract, not a taste decision.**
  `$events-timeline-width: 56px` is paid for twice (the strip and the grid's
  right padding), and `TIMELINE_MIN_WIDTH = 420` is documented in
  `KioskPersonenEvents.vue` as an *empirical* threshold measured against
  exactly that 56px: at 420px viewport the tiles land at 162px, just clear of
  the grid's own 156px floor. Widening the strip moves that threshold and the
  measurement has to be redone.
- **The axis can be given any span.** The quick ranges give 2h / 12h / 24h /
  7d, the `datetime-local` fields give anything, and an open lower bound falls
  back to the oldest listed event — which, on an empty list, is `axisEnd - 1h`.
  So the scale has to cope with spans from minutes to years, and with the
  collapsed one-second axis the `marks` computed already guards against.
- **A day is not 86400 seconds.** Austria switches DST twice a year; a scale
  stepped by adding fixed second counts drifts off the hour for half the year
  and puts "midnight" at 23:00 or 01:00.
- **Styles here are global.** The component has no `scoped` attribute; every
  class is `events-timeline-*` prefixed and lives in the cascade with
  Vuetify's. Verification of anything visual goes through computed style, not
  through reading the stylesheet (see the harness README).

## Goals / Non-Goals

**Goals:**

- The strip states the period it covers and how it is divided, using only the
  two bounds it already receives.
- One reading of "which unit is this" — the graduation is derived from the
  span, so the same picture cannot mean two different zoom levels.
- The scale costs nothing at the source and nothing in extra state: it is a
  pure function of `(axisStart, axisEnd, axis height in pixels, locale)`.
- Event marks stay the foreground; nothing about their behaviour changes.

**Non-Goals:**

- No zoom, pan or drag on the timeline, and no way to set the range from it —
  the existing non-goal stands.
- No density/histogram rendering, no aggregation of unloaded events.
- No second time-formatting stack: labels come from `dateUtils` and the active
  i18n locale, as the mark tooltips already do.
- No change to `axisStart()` / `axisEnd()` in the view, and no new prop.

## Decisions

### The step comes from a fixed ladder of calendar units, picked by pixel spacing

A ladder of `(minor, major)` unit pairs, coarsening upwards:

    1s→1min, 5s→1min, 15s→1min, 30s→1min,
    1min→15min, 5min→1h, 15min→1h, 30min→1h,
    1h→12h, 3h→12h, 6h→1d, 12h→1d,
    1d→1week, 1week→1month, 1month→1year, 1year→10years

The chosen rung is the *finest* one that clears two floors at once on the
current axis height; if none clears both, the coarsest rung is used.

- `MIN_TICK_PX` (≈8px) — the **minor** spacing floor. This is legibility: two
  ticks closer together than this are one thick tick.
- `MIN_MAJOR_SHARE` (⅓ of the axis) — the **major** spacing floor. This is
  meaning: the axis should carry about three major divisions, so the coarse
  mark reads as a division of *this* span rather than as a stray line.

One floor alone does not give the reading the proposal describes, and that is
worth writing down because the single-floor version looks sufficient until it
is measured. On a 900px strip a week-long span puts 12-hour ticks 64px apart —
comfortably legible — so a legibility floor on its own picks `12h→1d` for a
week and `15min→1h` for a day, leaving the two zoom levels as
indistinguishable as they are today. There is no value of a lone minor floor
that yields the four quick ranges' readings; the major floor is what carries
them.

With both floors, on a strip of any height: a 2h span lands on `5min→1h`
(1-minute ticks would be 7.5px apart, under the legibility floor, and a 15min
major would divide the span eight ways), a day on `1h→12h`, and a week on
`1d→1week` — which is the reading the proposal describes.

*Why a ladder and not `span / n`:* an equal division of the span produces ticks
at 03:47 and 05:14. The whole point is that a tick means *a new hour*, *noon*,
*a new day*; only boundaries of real units carry that meaning.

*Why pixel spacing and not span thresholds:* the strip is `100vh`, so its
height differs by a factor of three between a small kiosk panel and a desktop
window. Thresholds in hours would be right for exactly one of them.

*Why the major floor is a share of the axis where the minor floor is pixels:*
they answer different questions. "Can these two ticks be told apart" is about
the reader's eye and is therefore absolute; "does this span read as divided" is
about the axis and is therefore relative to it. An absolute major floor was
tried and is wrong at both ends: at 200px it graduates a 2h span on a squat
window to `1h→12h`, whose major boundary the span may not even contain, and
pushes a week on a tall window back down to `6h→1d`. Because the height cancels
out of the major test, the rung is stable across window sizes — which is the
wanted behaviour, the same range reading the same way on the kiosk panel and on
the desktop. Height still reaches the choice through the minor floor, which
coarsens the graduation on a strip too short to carry it.

*Why minor and major from one rung rather than "next unit up":* pairing them
explicitly keeps the coarse mark meaningful — `1h→12h` gives midnight *and*
noon, which is what the user asked for, where a mechanical "next unit" would
give only midnight and leave a 24-tick run unbroken.

*Alternative considered:* a `d3-time`-style tick generator. Rejected: a new
dependency for sixteen literals, in a Vue 2 app whose only date helper is
`dateUtils`.

### Boundaries are walked as local calendar dates, in `dateUtils`

A helper on `dateUtils` — beside `roundTimeToQuater()`, which is the same kind
of thing — takes a unit and a range and yields the local boundaries inside it:
snap a `Date` down to the unit with the local setters (`setSeconds`,
`setMinutes`, `setHours(0,0,0,0)`, `setDate(1)`), then advance with the
matching setter (`setDate(d+1)`, `setMonth(m+1)`, …) rather than by adding
milliseconds.

*Why:* `setDate()`/`setHours()` are DST- and month-length-aware; adding
`86400000` is not. This is the difference between a day tick at local midnight
all year and one that walks to 23:00 in November.

*Why in `dateUtils` and not the component:* it is calendar arithmetic, it is
locale-independent, and it is the piece most worth testing on its own. The
ladder and the pixel decision stay in the component — they are presentation.

*Guard:* the generator is bounded (it stops at the range end and at a hard cap
of a few hundred boundaries) so a pathological span cannot spin.

### Minor and major tick sets are generated independently

Majors are generated for the major unit, minors for the minor unit, and any
boundary present in both is drawn once, as a major.

*Why:* the tempting invariant "every major is also a minor" does not hold —
`1week→1month` is exactly the pair where a month boundary falls mid-week.
Generating both sets and de-duplicating costs nothing and removes the whole
class of problem.

### The strip keeps its 56px, split into a text lane and a graphic lane

The rail moves off centre to sit in the right third. Left of it: a text lane
carrying the two axis-end labels and the major-tick labels. Right of it: the
rail, the ticks (minor short, major long and heavier), and the event marks,
whose visible bar is re-anchored around the rail's new position.

*Why not widen the strip:* `TIMELINE_MIN_WIDTH = 420` was measured against
56px and sits 6px above the grid's tile floor. Going to 72px costs the tiles
that margin at exactly the widths where they have none, and forces the whole
measurement to be redone for a cosmetic gain.

*Why lanes rather than labels drawn across the strip:* text over an event mark
is the one place the scale could actually damage the reading it is there to
support. Separate lanes make "the scale never obscures a mark" structural
instead of a matter of opacity.

*Consequence:* labels are small (≈10px) and short — `12:00` for a time-of-day
boundary, `2.9.` for a day, the short month for a month. The axis-end labels
get two lines, date over time.

*Consequence, measured:* two lines are not enough for a *padded* date. The
text lane is 30px and `03.09.2026` is ~50px at 10px, so the year comes off the
strip: the visible date is day and month, and the full padded moment rides in
the end label's `title` and accessible name, where it costs no width. This is
the one place the 56px contract actually bites, and it is a better trade than
the escape hatch below — a year is what a reader of a live event timeline is
least likely to be missing.

*Consequence, also measured:* the strip stops 40px short of the foot of the
viewport. `App.vue` parks `.kiosk-migrations-btn` in the bottom right corner at
the same `z-index: 20`, and a 28px button 8px off the edge covers the bottom
36px of this column — which used to cost nothing, the strip's foot being bare
rail, and now covers the label naming where the axis starts. The host owns
where the strip sits, so the host shortens it; the component measures its own
height, so the graduation follows without being told. (A mark landing at
`axisStart` was never clickable under that button either.)

*Escape hatch, if it proves unreadable at kiosk distance:* widen
`$events-timeline-width` and re-measure `TIMELINE_MIN_WIDTH` the way its
comment documents. Recorded here so the trade-off is visible rather than
rediscovered.

### Label thinning is a second pixel rule, not a second unit

Every major tick is drawn; a major tick is *labelled* only if its label is at
least `MIN_LABEL_PX` (≈22px, ~2 line-heights) from the last label placed and
from both axis-end labels. Walking from one end and dropping collisions keeps
the surviving labels evenly spread without changing the graduation.

*Why not coarsen the unit until labels fit:* that would take ticks away as
well. Ticks are cheap and carry the rhythm; labels are what run out of room.

*Why the end labels win:* they are the anchor — without them a tick label is a
time with no period around it.

### The axis height is measured, with a fallback

The component reads its own `clientHeight` on mount and on window resize into a
data property, defaulting to 800 before the first measurement. The scale
computed depends on it.

*Why measured rather than `window.innerHeight`:* the strip is `100vh` today,
but that is the host's decision, not the component's; measuring keeps the
component correct if the host ever changes it.

*Why not a `ResizeObserver`:* the strip changes size only with the viewport,
the app targets Chrome kiosks but the codebase carries no observer
infrastructure, and a resize listener is the smaller thing to get right.

### Nothing about the marks changes

Marks keep their DOM, their button semantics, their activation event and their
tooltips. Ticks and labels are non-interactive presentation: no `tabindex`, no
handlers, `pointer-events: none`, drawn below the marks in stacking order.

## Risks / Trade-offs

- **10px labels on a kiosk panel are small.** → The two axis-end labels are the
  ones that must be readable; tick labels are supporting detail and the ticks
  themselves carry the rhythm without them. The escape hatch above is the
  answer if measurement in the running app says otherwise.
- **The scale redraws several times a minute with a live axis.** → It is a
  computed over two numbers, one measured height and a bounded boundary walk
  (tens of entries). The visible effect is the ticks creeping downward with the
  clock, which is what a live axis means; the *step* only changes when the span
  changes, so there is no flicker between rungs.
- **A collapsed axis (start == end, empty list under an open range).** → The
  existing one-second floor stays; at that span the ladder's finest rung
  applies and produces at most a couple of ticks. The end labels still render,
  which is an improvement on today's blank strip.
- **A very long span (unbounded lower end over years of history).** → The
  ladder is capped at `1year→10years` and the generator is bounded, so the
  worst case is a sparse axis rather than a hang.
- **Theme contrast.** → Ticks use `currentColor` at opacities below the marks',
  the same mechanism the rail already uses, so dark and light themes are
  handled by inheritance rather than by a second palette.
- **Global styles.** → New classes stay `events-timeline-*` prefixed;
  verification asserts on computed style, per the harness README, because a
  correct-looking rule can be dead in Vuetify's cascade.
