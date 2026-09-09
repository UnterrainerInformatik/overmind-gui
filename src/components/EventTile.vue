<template>
  <v-card
    outlined
    class="events-card noFocus"
    :class="{ 'events-card--highlighted': highlighted }"
    @click="$emit('select', entry)"
  >
    <div class="events-card-media">
      <v-img :src="entry.thumbnailUrl" aspect-ratio="1.7777" class="grey darken-4"></v-img>
      <!-- Over the thumbnail rather than in the text block on purpose: a marker
           arrives on a request of its own (the events page reads the archive
           index separately, the archive page re-reads a pending entry), and a
           marker that took a line of its own would reflow the grid under the
           scroll-anchor compensation the pages do after a merge. -->
      <v-icon
        v-if="marker"
        small
        class="events-card-archived"
        :class="marker.tone ? `events-card-archived--${marker.tone}` : ''"
        :title="marker.title"
      >{{ marker.icon }}</v-icon>
    </div>
    <v-card-text class="pa-2">
      <div class="events-card-name text-truncate">
        {{ entry.subLabel || $t('component.events.unknown') }}
      </div>
      <div class="events-card-time">{{ dateUtils.dateToShortDateTime(startedAt, $i18n.locale) }}</div>
      <div v-if="cameraName" class="events-card-camera text-truncate">{{ cameraName }}</div>
      <div v-if="entry.zones.length" class="events-card-zones text-truncate">{{ entry.zones.join(', ') }}</div>
    </v-card-text>
  </v-card>
</template>

<script type="js">
import { singleton as dateUtils } from '@/utils/dateUtils'

/**
 * One tile in a grid of recordings, used by the events page for a Frigate event
 * and by the archive page for an archive entry mapped onto the same listing
 * shape: `{ id, startTime, subLabel, zones, thumbnailUrl }`.
 *
 * The root class is `events-card` and stays that: both pages find a tile by
 * that class and by the entry's index in their list when the timeline reveals
 * one, so renaming it would break the reveal silently rather than loudly.
 *
 * The component owns no state and knows nothing about the archive. What a
 * marker means is the calling page's business - it arrives as
 * `{ icon, tone, title }` already worded - because "gesichert", "wird
 * vorbereitet" and "fehlgeschlagen" are sentences about a page's subject, not
 * about a tile.
 */
export default {
  name: 'EventTile',

  props: {
    /** the listing entry: `{ id, startTime, subLabel, zones, thumbnailUrl }` */
    entry: {
      type: Object,
      required: true
    },
    /** whether the timeline last pointed at this one */
    highlighted: {
      type: Boolean,
      default: false
    },
    /** the camera to name on the tile; empty for "do not show one" */
    cameraName: {
      type: String,
      default: ''
    },
    /** `{ icon, tone, title }` drawn over the thumbnail, or null for none */
    marker: {
      type: Object,
      default: null
    }
  },

  data: () => ({
    dateUtils
  }),

  computed: {
    startedAt () {
      return new Date(this.entry.startTime * 1000)
    }
  }
}
</script>

<style lang="scss">
.events-card {
  cursor: pointer;
}

/* .v-card--outlined's border is what this replaces, so the rule is qualified
   with .v-card to clear that specificity. */
.v-card.events-card--highlighted {
  border-color: var(--v-primary-base, #1976d2);
  box-shadow: 0 0 0 2px var(--v-primary-base, #1976d2);
}

/* The marker sits over the thumbnail and takes no space in the tile's flow -
   see the template. */
.events-card-media {
  position: relative;
}

.v-icon.events-card-archived {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #fff;
  /* the thumbnails are photographs: a plain white glyph disappears over a
     bright frame, so the badge carries its own ground */
  background: rgba(0, 0, 0, 0.55);
  border-radius: 50%;
  padding: 2px;
}

.v-icon.events-card-archived--failed {
  color: var(--v-error-base, #ff5252);
}

.v-icon.events-card-archived--pending {
  color: var(--v-warning-base, #fb8c00);
}

.events-card-name {
  font-weight: 500;
}

.events-card-time,
.events-card-camera,
.events-card-zones {
  font-size: 12px;
  opacity: 0.8;
}

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
