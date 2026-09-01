<template>
  <div class="events-timeline" role="group" :aria-label="label">
    <div class="events-timeline-rail"></div>
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

  computed: {
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
  }
}
</script>

<style lang="scss">
@import 'index.scss';

/* Where this sits on the page - fixed against the right edge - and the grid
   padding that keeps the tiles out from under it are owned by
   KioskPersonenEvents.vue, which drives both from one width variable. This
   block is only the timeline's own insides. */
.events-timeline {
  position: relative;
  height: 100%;
}

.events-timeline-rail {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  margin-left: -1px;
  background: currentColor;
  opacity: 0.25;
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
  left: 20%;
  right: 20%;
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
  left: 8%;
  right: 8%;
  top: 3px;
  height: 6px;
  border-radius: 3px;
  opacity: 1;
  background: var(--v-primary-base, #1976d2);
}
</style>
