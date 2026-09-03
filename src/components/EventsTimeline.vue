<template>
  <div class="events-timeline" role="group" :aria-label="label">
    <!-- the graduation: presentation only, so it is hidden from the reading
         order entirely. The two end labels below carry the axis's meaning to a
         screen reader; a run of tick lines would only be noise. -->
    <div class="events-timeline-scale" aria-hidden="true">
      <div
        v-for="tick in scale"
        :key="tick.key"
        class="events-timeline-tick"
        :class="{ 'events-timeline-tick--major': tick.major }"
        :style="{ top: tick.top }"
      ></div>
      <div
        v-for="tickLabel in tickLabels"
        :key="tickLabel.key"
        class="events-timeline-tick-label"
        :style="{ top: tickLabel.top }"
      >{{ tickLabel.text }}</div>
    </div>

    <div class="events-timeline-rail"></div>

    <div
      class="events-timeline-end events-timeline-end--top"
      :title="axisLabels.end.name"
      :aria-label="axisLabels.end.name"
    >
      <span class="events-timeline-end-date">{{ axisLabels.end.date }}</span>
      <span class="events-timeline-end-time">{{ axisLabels.end.time }}</span>
    </div>
    <div
      class="events-timeline-end events-timeline-end--bottom"
      :title="axisLabels.start.name"
      :aria-label="axisLabels.start.name"
    >
      <span class="events-timeline-end-date">{{ axisLabels.start.date }}</span>
      <span class="events-timeline-end-time">{{ axisLabels.start.time }}</span>
    </div>

    <button
      v-for="mark in marks"
      :key="mark.id"
      type="button"
      class="events-timeline-mark"
      :class="{ 'events-timeline-mark--active': mark.id === highlightedId }"
      :style="{ top: mark.top }"
      :title="mark.title"
      :aria-label="mark.title"
      @click="$emit('activate', mark.id)"
    ></button>
  </div>
</template>

<script lang="js">
import { singleton as dateUtils } from '@/utils/dateUtils'

/* Two ticks closer together than this are one thick tick, so no rung whose
   minor step lands below it may be chosen however much it would like to be. */
const MIN_TICK_PX = 8

/* ... and the major step has to divide the axis into about three, or the
   coarse mark stops reading as a division of *this* span and becomes a stray
   line. A share rather than a pixel count on purpose: legibility is a question
   about the eye and is absolute, "does this span read as divided" is a
   question about the axis and is relative to it. See design.md. */
const MIN_MAJOR_SHARE = 1 / 3

/* Two label lines' worth. A major tick closer than this to the last label
   placed - or to either end label, which always win - keeps its tick and loses
   its text: ticks are cheap and carry the rhythm, labels are what run out of
   room. */
const MIN_LABEL_PX = 22

/* The reserve at each end of the axis is larger than the gap between two tick
   labels, because the two are not the same measurement: an end label is two
   lines tall and a tick label is centred on its moment, so the end label's own
   22px plus half a tick line is what actually keeps them apart. Measured the
   short way once and it was 1.3px too little - the ends win, so the margin is
   theirs. */
const END_LABEL_PX = 28

/* Height to size the scale with until the strip has been measured. */
const FALLBACK_AXIS_HEIGHT = 800

/**
 * The graduations the scale may be stepped in, finest first. Each rung pairs a
 * minor step with the major it rolls up into, and the pairing is picked rather
 * than derived: a mechanical "next unit up" would give an hour scale a major
 * only at midnight and leave a 24-tick run unbroken, where `1h -> 12h` marks
 * midnight *and* noon, which is the reading the axis is for.
 *
 * `seconds` is nominal - it sizes the rung for the spacing test only. The
 * ticks themselves are walked as local calendar dates, so the month that is
 * 30.44 days here is 28 or 31 where it is actually drawn.
 *
 * `label` says what a major on this rung is called: a time of day up to the
 * half-day, then the date, the month, the year. Midnight is the exception
 * inside `time` - a boundary that opens a day is named by the day.
 */
const SCALE_LADDER = [
  { minorUnit: 'second', minorStep: 1, minorSeconds: 1, majorUnit: 'minute', majorStep: 1, majorSeconds: 60, label: 'time' },
  { minorUnit: 'second', minorStep: 5, minorSeconds: 5, majorUnit: 'minute', majorStep: 1, majorSeconds: 60, label: 'time' },
  { minorUnit: 'second', minorStep: 15, minorSeconds: 15, majorUnit: 'minute', majorStep: 1, majorSeconds: 60, label: 'time' },
  { minorUnit: 'second', minorStep: 30, minorSeconds: 30, majorUnit: 'minute', majorStep: 1, majorSeconds: 60, label: 'time' },
  { minorUnit: 'minute', minorStep: 1, minorSeconds: 60, majorUnit: 'minute', majorStep: 15, majorSeconds: 900, label: 'time' },
  { minorUnit: 'minute', minorStep: 5, minorSeconds: 300, majorUnit: 'hour', majorStep: 1, majorSeconds: 3600, label: 'time' },
  { minorUnit: 'minute', minorStep: 15, minorSeconds: 900, majorUnit: 'hour', majorStep: 1, majorSeconds: 3600, label: 'time' },
  { minorUnit: 'minute', minorStep: 30, minorSeconds: 1800, majorUnit: 'hour', majorStep: 1, majorSeconds: 3600, label: 'time' },
  { minorUnit: 'hour', minorStep: 1, minorSeconds: 3600, majorUnit: 'hour', majorStep: 12, majorSeconds: 43200, label: 'time' },
  { minorUnit: 'hour', minorStep: 3, minorSeconds: 10800, majorUnit: 'hour', majorStep: 12, majorSeconds: 43200, label: 'time' },
  { minorUnit: 'hour', minorStep: 6, minorSeconds: 21600, majorUnit: 'day', majorStep: 1, majorSeconds: 86400, label: 'date' },
  { minorUnit: 'hour', minorStep: 12, minorSeconds: 43200, majorUnit: 'day', majorStep: 1, majorSeconds: 86400, label: 'date' },
  { minorUnit: 'day', minorStep: 1, minorSeconds: 86400, majorUnit: 'week', majorStep: 1, majorSeconds: 604800, label: 'date' },
  { minorUnit: 'week', minorStep: 1, minorSeconds: 604800, majorUnit: 'month', majorStep: 1, majorSeconds: 2629800, label: 'month' },
  { minorUnit: 'month', minorStep: 1, minorSeconds: 2629800, majorUnit: 'year', majorStep: 1, majorSeconds: 31557600, label: 'year' },
  { minorUnit: 'year', minorStep: 1, minorSeconds: 31557600, majorUnit: 'year', majorStep: 10, majorSeconds: 315576000, label: 'year' }
]

/**
 * The finest rung that clears both floors, or the coarsest rung when a span is
 * longer than the ladder reaches. The height cancels out of the major test - a
 * share of the axis is a share of the axis - which is deliberate: the same
 * range should graduate the same way on the kiosk panel and on the desktop,
 * and height reaches the choice only through the minor floor, where it belongs.
 */
function pickRung (span, height) {
  return SCALE_LADDER.find(rung =>
    height * rung.minorSeconds / span >= MIN_TICK_PX &&
    rung.majorSeconds / span >= MIN_MAJOR_SHARE
  ) || SCALE_LADDER[SCALE_LADDER.length - 1]
}

export default {
  name: 'EventsTimeline',

  props: {
    // the events to plot, most-recent-first, exactly as the view holds them
    events: { type: Array, default: () => [] },
    // epoch seconds; the axis runs from `axisStart` at the bottom to `axisEnd`
    // at the top, so its most recent end matches the top of the grid's order
    axisStart: { type: Number, default: 0 },
    axisEnd: { type: Number, default: 0 },
    highlightedId: { type: String, default: null },
    label: { type: String, default: '' }
  },

  data: () => ({
    // the strip's own height in pixels, which is what decides how fine the
    // graduation may be. Measured rather than taken from the viewport: the
    // strip is 100vh because the host says so, not because the component does.
    axisHeight: FALLBACK_AXIS_HEIGHT
  }),

  mounted () {
    this.measureAxis()
    window.addEventListener('resize', this.measureAxis)
  },

  beforeDestroy () {
    window.removeEventListener('resize', this.measureAxis)
  },

  computed: {
    /* The graduation this span and this strip height call for. Kept apart from
       `scale` so the label formatter can ask what unit it is naming. */
    rung () {
      return pickRung(Math.max(this.axisEnd - this.axisStart, 1), this.axisHeight)
    },

    /**
     * The ticks to draw, newest first, so the array runs down the strip from
     * the top. Majors and minors are walked separately and a minor landing on
     * a major is dropped, because the tempting invariant "every major is also
     * a minor" is false exactly where it matters: on the `1week -> 1month`
     * rung a month opens mid-week, and de-duplicating is cheaper than
     * discovering that later as a double-drawn line.
     * The one-second floor is the same guard `marks` uses, for the same
     * collapsed axis.
     */
    scale () {
      const span = Math.max(this.axisEnd - this.axisStart, 1)
      const majors = dateUtils.calendarBoundaries(
        this.rung.majorUnit, this.rung.majorStep, this.axisStart, this.axisEnd)
      const isMajor = {}
      majors.forEach(at => { isMajor[at] = true })
      const minors = dateUtils.calendarBoundaries(
        this.rung.minorUnit, this.rung.minorStep, this.axisStart, this.axisEnd)
        .filter(at => !isMajor[at])

      const tick = (at, major) => ({
        key: `${major ? 'M' : 'm'}${at}`,
        at,
        major,
        top: `${(this.axisEnd - at) / span * 100}%`
      })
      return majors.map(at => tick(at, true))
        .concat(minors.map(at => tick(at, false)))
        .sort((a, b) => b.at - a.at)
    },

    /**
     * The majors that get to keep their text. `scale` runs down the strip, so
     * one walk from the top placing a label only where it clears the last one
     * by `MIN_LABEL_PX` leaves the survivors evenly spread without touching the
     * graduation itself. Both ends of the axis are reserved outright: an end
     * label is the anchor a tick label is read against, so a collision there is
     * settled in the end label's favour rather than by overlapping the two.
     */
    tickLabels () {
      const height = this.axisHeight
      const labels = []
      let lastPx = -Infinity
      this.scale.forEach(tick => {
        if (!tick.major) {
          return
        }
        const px = parseFloat(tick.top) / 100 * height
        if (px < END_LABEL_PX || px > height - END_LABEL_PX || px - lastPx < MIN_LABEL_PX) {
          return
        }
        lastPx = px
        labels.push({ key: `L${tick.key}`, top: tick.top, text: this.momentText(tick.at) })
      })
      return labels
    },

    /**
     * The two labels that state the period the strip covers, date over time.
     * Shown whatever the list holds - they describe the axis, not the events -
     * and recomputed with `axisEnd`, so an open upper bound keeps naming the
     * present moment as the view re-renders instead of freezing at load time.
     * The year is not on the strip: the lane is 30px wide and a padded date is
     * not, so it rides in the `title` and the accessible name instead.
     */
    axisLabels () {
      return { start: this.endLabel(this.axisStart, 'timelineAxisStart'), end: this.endLabel(this.axisEnd, 'timelineAxisEnd') }
    },

    /**
     * One mark per listed event, positioned by its timestamp's share of the
     * axis. The component loads nothing and keeps no copy of the list: the
     * view owns `events`, filters and paging, so the timeline and the grid
     * cannot drift apart.
     * The span is floored at one second so an axis that has collapsed - an
     * empty list under an open-ended range leaves start and end on the same
     * moment - still renders (without marks) rather than dividing by zero.
     * Positions are clamped because an event can sit outside the axis for a
     * moment: the axis follows the filter fields, the list follows the
     * request they triggered, and the two land one tick apart.
     */
    marks () {
      const span = Math.max(this.axisEnd - this.axisStart, 1)
      return this.events.map(event => {
        const share = (this.axisEnd - event.startTime) / span
        return {
          id: event.id,
          top: `${Math.min(Math.max(share, 0), 1) * 100}%`,
          title: dateUtils.dateToShortDateTime(new Date(event.startTime * 1000), this.$i18n.locale)
        }
      })
    }
  },

  methods: {
    /**
     * What a major tick on the current rung is called. A boundary that opens a
     * day is named by the day even on a time-of-day rung: on the `1h -> 12h`
     * graduation that is what tells midnight from noon, and it is the only
     * place the date reaches the middle of the axis.
     */
    momentText (at) {
      const moment = new Date(at * 1000)
      const locale = this.$i18n.locale
      switch (this.rung.label) {
        case 'time':
          return moment.getHours() === 0 && moment.getMinutes() === 0
            ? dateUtils.dateToShortDayMonth(moment, locale)
            : dateUtils.dateToShortTime(moment, locale)
        case 'date':
          return dateUtils.dateToShortDayMonth(moment, locale)
        case 'month':
          return dateUtils.dateToShortMonth(moment, locale)
        default:
          return dateUtils.dateToYear(moment, locale)
      }
    },

    endLabel (at, key) {
      const moment = new Date(at * 1000)
      const locale = this.$i18n.locale
      return {
        date: dateUtils.dateToShortDayMonth(moment, locale),
        time: dateUtils.dateToShortTime(moment, locale),
        name: this.$t(`page.kiosk.personenEvents.${key}`, {
          moment: dateUtils.dateToShortDateTime(moment, locale)
        })
      }
    },

    measureAxis () {
      const height = this.$el && this.$el.clientHeight
      if (height) {
        this.axisHeight = height
      }
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';

/* Where this sits on the page - fixed against the right edge - and the grid
   padding that keeps the tiles out from under it are owned by
   KioskPersonenEvents.vue, which drives both from one width variable. This
   block is only the timeline's own insides. */
/* The strip's 56px splits into two lanes: every piece of text the scale draws
   lives on the left, the rail, the ticks and the event marks on the right.
   Separating them is what makes "the scale never obscures a mark" structural
   instead of a matter of opacity - text over a mark is the one place a
   graduation could damage the reading it exists to support.
   Every horizontal position below is measured from the right edge off these
   two, so the rail and everything centred on it move together. */
$events-timeline-graphic-lane: 24px;
$events-timeline-rail-center: $events-timeline-graphic-lane / 2;

@mixin events-timeline-centred-on-rail($width) {
  right: $events-timeline-rail-center - $width / 2;
  left: auto;
  width: $width;
}

@mixin events-timeline-text-lane {
  left: 2px;
  right: $events-timeline-graphic-lane + 2px;
  font-size: 10px;
  line-height: 11px;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  /* nothing in this lane is a target: a pointer aimed at a mark passes
     through it to the button underneath. */
  pointer-events: none;
}

.events-timeline {
  position: relative;
  height: 100%;
}

.events-timeline-rail {
  position: absolute;
  top: 0;
  bottom: 0;
  @include events-timeline-centred-on-rail(2px);
  background: currentColor;
  opacity: 0.25;
}

/* Drawn before the marks and never focusable, so it sits under them both in
   paint order and in the reading order. */
.events-timeline-scale {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}

/* Two weights, told apart by length and by thickness rather than by colour
   alone, and both quieter than a mark's 0.7 so the events stay the foreground.
   currentColor for the same reason the rail uses it: the theme is inherited,
   not restated. */
.events-timeline-tick {
  position: absolute;
  @include events-timeline-centred-on-rail(8px);
  height: 1px;
  margin-top: -0.5px;
  background: currentColor;
  opacity: 0.2;
}

.events-timeline-tick--major {
  @include events-timeline-centred-on-rail(16px);
  height: 2px;
  margin-top: -1px;
  opacity: 0.45;
}

.events-timeline-tick-label {
  position: absolute;
  @include events-timeline-text-lane;
  margin-top: -5.5px;
  opacity: 0.55;
}

/* The anchors: two lines each, date over time. They are placed against the
   ends of the strip rather than at a percentage, so the top one grows
   downwards and the bottom one upwards and neither can leave the axis. */
.events-timeline-end {
  position: absolute;
  @include events-timeline-text-lane;
  display: flex;
  flex-direction: column;
  opacity: 0.85;
}

.events-timeline-end--top {
  top: 0;
}

.events-timeline-end--bottom {
  bottom: 0;
}

.events-timeline-end-time {
  opacity: 0.75;
}

/* The button is the hit area, the ::before is the mark. A mark thin enough to
   read as a moment is far too thin to hit, and a burst inside one minute is a
   fraction of a pixel on a two-hour axis - so the visible bar carries a
   minimum height and overlapping marks simply stack into a thicker band,
   which is the reading wanted at that zoom. */
.events-timeline-mark {
  position: absolute;
  left: 0;
  right: 0;
  height: 12px;
  margin-top: -6px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  outline: none;
}

.events-timeline-mark::before {
  content: '';
  position: absolute;
  @include events-timeline-centred-on-rail(18px);
  top: 5px;
  height: 3px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0.7;
}

.events-timeline-mark:hover::before,
.events-timeline-mark:focus::before {
  opacity: 1;
}

.events-timeline-mark--active::before {
  @include events-timeline-centred-on-rail(24px);
  top: 3px;
  height: 6px;
  border-radius: 3px;
  opacity: 1;
  background: var(--v-primary-base, #1976d2);
}
</style>
