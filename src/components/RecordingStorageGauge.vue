<template>
  <!-- Dense: one thin two-segment bar and one line, for a list row. -->
  <div v-if="dense" class="storage-gauge storage-gauge--dense">
    <div v-if="!allUnknown" class="storage-gauge-dense-bars d-flex">
      <v-progress-linear
        v-if="fill !== null"
        class="storage-gauge-ring-bar"
        :value="fillPercentBar"
        :color="RING_COLOUR"
        height="6"
        rounded
      ></v-progress-linear>
      <v-progress-linear
        v-if="!archive && diskFree !== null"
        class="storage-gauge-disk-bar"
        :class="colourClass"
        :value="diskUsedPercent"
        :color="barColour"
        height="6"
        rounded
      ></v-progress-linear>
    </div>
    <div class="storage-gauge-dense-line">
      <template v-if="allUnknown">
        <span class="text--disabled">{{ $t('page.kiosk.cameras.storageGauge.unknown') }}</span>
      </template>
      <template v-else>
        <span class="storage-gauge-dense-ring">{{ denseRingText }}</span>
        <template v-if="!archive">
          <span class="mx-1">·</span>
          <v-icon v-if="textClass" x-small :color="colour" class="storage-gauge-alert-icon mr-1">warning</v-icon>
          <span class="storage-gauge-dense-disk" :class="textClass">{{ denseDiskText }}</span>
        </template>
      </template>
    </div>
  </div>

  <!-- Full: the ring and the disk as two labelled facts. -->
  <div v-else class="storage-gauge storage-gauge--full">
    <div v-if="allUnknown" class="storage-gauge-unknown text--disabled">
      {{ archive ? $t('page.kiosk.personenArchiv.usage.unknown') : $t('page.kiosk.cameras.storageGauge.unknown') }}
    </div>

    <template v-else>
      <div class="storage-gauge-ring">
        <div class="storage-gauge-label">
          {{ archive ? $t('page.kiosk.personenArchiv.usage.title') : $t('page.kiosk.cameras.storageGauge.ringTitle') }}
        </div>
        <template v-if="ring === null">
          <div class="storage-gauge-ring-text storage-gauge-no-ring">{{ $t('page.kiosk.cameras.storageGauge.noRing') }}</div>
        </template>
        <template v-else>
          <!-- Neutral whatever the level: a full ring is what a ring buffer
               is for, not an alarm. -->
          <v-progress-linear
            v-if="fill !== null"
            class="storage-gauge-ring-bar"
            :value="fillPercentBar"
            :color="RING_COLOUR"
            height="8"
            rounded
          ></v-progress-linear>
          <div class="storage-gauge-ring-text">{{ ringText }}</div>
          <div v-if="archive && reachesBackText" class="storage-gauge-reaches-back">{{ reachesBackText }}</div>
          <div v-if="!archive && ringDays !== null" class="storage-gauge-ring-days">
            {{ $t('page.kiosk.cameras.storageGauge.ringDays', { duration: duration(ringDays * 24) }) }}
          </div>
        </template>
      </div>

      <div v-if="!archive" class="storage-gauge-disk mt-2">
        <div class="storage-gauge-label">{{ $t('page.kiosk.cameras.storageGauge.diskTitle') }}</div>
        <template v-if="diskFree === null">
          <div class="storage-gauge-disk-text text--disabled">{{ $t('page.kiosk.cameras.storageGauge.diskUnknown') }}</div>
        </template>
        <template v-else>
          <v-progress-linear
            class="storage-gauge-disk-bar"
            :class="colourClass"
            :value="diskUsedPercent"
            :color="barColour"
            height="8"
            rounded
          ></v-progress-linear>
          <!-- The icon carries the signal the text cannot: this theme's error
               red is too dark to be read as a colour of text on a dark card. -->
          <div class="storage-gauge-disk-text" :class="textClass">
            <v-icon v-if="textClass" small :color="colour" class="storage-gauge-alert-icon mr-1">warning</v-icon>{{ diskText }}
          </div>
          <div v-if="colour === 'error'" class="storage-gauge-frigate-deletes error--text">
            {{ $t('page.kiosk.cameras.storageGauge.frigateDeletes') }}
          </div>
          <div v-if="ringLargerThanDisk" class="storage-gauge-ring-larger">
            {{ $t('page.kiosk.cameras.storageGauge.ringLargerThanDisk') }}
          </div>
        </template>
      </div>

      <div v-if="!archive" class="storage-gauge-reading mt-1 text-caption">
        <span v-if="reportedAt">{{ $t('page.kiosk.cameras.storageGauge.readAt', { at: readAtText }) }}</span>
        <span v-else class="text--disabled">{{ $t('page.kiosk.cameras.storageGauge.readAtUnknown') }}</span>
        <span v-if="stale" class="storage-gauge-stale warning--text">
          · {{ $t('page.kiosk.cameras.storageGauge.stale') }}
        </span>
      </div>
    </template>

    <div v-if="archive" class="storage-gauge-archive-note mt-1 text-caption">
      {{ $t('page.kiosk.personenArchiv.usage.ringNote') }}
    </div>
  </div>
</template>

<script lang="js">
import { singleton as cameraUtils } from '@/utils/cameraUtils'
import { singleton as dateUtils } from '@/utils/dateUtils'

/**
 * The ring's colour, the same at every fill level. Not the theme's `primary`:
 * this installation's is a near-black button grey that vanishes on a dark card,
 * and a full ring must stay readable without looking like a warning.
 */
const RING_COLOUR = 'blue-grey lighten-1'

/**
 * How full a recording ring buffer is and, for a node, how long the disk under
 * it lasts at the current recording rate (openspec change
 * `recording-ring-buffer`).
 *
 * The two are separate facts on purpose. A full ring is the normal state of a
 * ring buffer - the oldest recordings give way - and is drawn in one neutral
 * colour whatever its level. Only the disk headroom is ever coloured, and only when the disk
 * would run out before the ring fills; the decision lives in cameraUtils, this
 * component only words it.
 *
 * `figures` is a node, or for the archive `{ recordingRingBytes: capacity,
 * recordingsBytes: used }` with `archive` set, which drops the disk half. Null
 * figures - an unreadable archive - are shown as unknown.
 */
export default {
  name: 'recordingStorageGauge',

  props: {
    figures: { type: Object, default: null },
    dense: { type: Boolean, default: false },
    archive: { type: Boolean, default: false },
    // the archive's oldest entry, epoch seconds; null on an empty archive
    oldestStartTime: { type: Number, default: null }
  },

  data: () => ({
    RING_COLOUR
  }),

  computed: {
    f () {
      return this.figures || {}
    },

    ring () {
      const ring = this.f.recordingRingBytes
      return typeof ring === 'number' ? ring : null
    },

    used () {
      const used = this.f.recordingsBytes
      return typeof used === 'number' ? used : null
    },

    rate () {
      const rate = this.f.recordingRateBytesPerHour
      return typeof rate === 'number' ? rate : null
    },

    fill () {
      return cameraUtils.ringFill(this.f)
    },

    fillPercent () {
      return this.fill === null ? null : Math.round(this.fill * 100)
    },

    fillPercentBar () {
      return this.fill === null ? 0 : Math.min(100, this.fill * 100)
    },

    full () {
      return this.fill !== null && this.fill >= 1
    },

    diskFree () {
      return this.archive ? null : cameraUtils.diskFree(this.f)
    },

    diskUsedPercent () {
      const total = this.f.storageTotalBytes
      return this.diskFree === null || !total ? 0 : Math.min(100, (1 - this.diskFree / total) * 100)
    },

    hours () {
      return cameraUtils.headroomHours(this.f)
    },

    ringDays () {
      return cameraUtils.ringDays(this.f)
    },

    colour () {
      return this.archive ? null : cameraUtils.headroomColour(this.f)
    },

    /** A theme colour for the disk bar; neutral and uncoloured are both grey. */
    barColour () {
      return this.colour === 'error' || this.colour === 'warning' ? this.colour : 'grey'
    },

    textClass () {
      return this.colour === 'error' || this.colour === 'warning' ? `${this.colour}--text` : ''
    },

    // what the harness asserts on, independently of how Vuetify paints the bar
    colourClass () {
      return `storage-gauge-colour--${this.colour || 'none'}`
    },

    ringLargerThanDisk () {
      return this.ring !== null && cameraUtils.dangerApplies(this.f) === true
    },

    /**
     * Nothing to say at all. A node without a ring is not unknown when the
     * rest is reported - "no ring configured" is a fact - but a node that
     * reports none of the figures says nothing about its ring either.
     */
    allUnknown () {
      if (this.archive) {
        // the archive always has a size; without one nothing it says is known
        return !this.figures || this.ring === null
      }
      return this.ring === null && this.used === null && this.diskFree === null && this.rate === null
    },

    ringText () {
      const used = cameraUtils.gigabytes(this.used)
      const total = cameraUtils.gigabytes(this.ring)
      const scope = this.archive ? 'page.kiosk.personenArchiv.usage' : 'page.kiosk.cameras.storageGauge'
      if (this.fill === null) {
        return this.$t(`${scope}.fillUnknown`, { total })
      }
      if (this.archive && this.used === 0) {
        return this.$t(`${scope}.empty`, { total })
      }
      return this.full
        ? this.$t(`${scope}.full`, { used, total })
        : this.$t(`${scope}.fill`, { percent: this.fillPercent, used, total })
    },

    reachesBackText () {
      return this.oldestStartTime === null
        ? ''
        : this.$t('page.kiosk.personenArchiv.usage.reachesBack', {
          date: dateUtils.dateToDatePadded(new Date(this.oldestStartTime * 1000), this.$i18n.locale)
        })
    },

    diskText () {
      const free = cameraUtils.gigabytes(this.diskFree)
      if (this.rate === null) {
        return this.$t('page.kiosk.cameras.storageGauge.diskRateUnknown', { free })
      }
      if (this.hours === null) {
        return this.$t('page.kiosk.cameras.storageGauge.diskNothingRecorded', { free })
      }
      return this.$t('page.kiosk.cameras.storageGauge.diskHeadroom', { free, duration: this.duration(this.hours) })
    },

    denseRingText () {
      const scope = 'page.kiosk.cameras.storageGauge'
      if (this.archive) {
        return this.ringText
      }
      if (this.ring === null) {
        return this.$t(`${scope}.denseNoRing`)
      }
      if (this.fill === null) {
        return this.$t(`${scope}.denseRingUnknown`)
      }
      return this.full
        ? this.$t(`${scope}.denseRingFull`)
        : this.$t(`${scope}.denseRing`, { percent: this.fillPercent })
    },

    denseDiskText () {
      const scope = 'page.kiosk.cameras.storageGauge'
      if (this.diskFree === null) {
        return this.$t(`${scope}.denseDiskUnknown`)
      }
      return this.hours === null
        ? this.$t(`${scope}.denseDiskFree`, { free: cameraUtils.gigabytes(this.diskFree) })
        : this.$t(`${scope}.denseDisk`, { duration: this.duration(this.hours) })
    },

    reportedAt () {
      return this.f.storageReportedAt || null
    },

    readAtText () {
      return dateUtils.isoToShortDateTime(this.reportedAt, this.$i18n.locale)
    },

    stale () {
      return cameraUtils.isStale(this.reportedAt)
    }
  },

  methods: {
    /**
     * Hours of recording as the unit a person would say it in, rounded - the
     * rate fluctuates with motion and night, so anything finer would be false
     * precision.
     */
    duration (hours) {
      const scope = 'page.kiosk.cameras.storageGauge'
      if (hours < 1) {
        const minutes = Math.max(1, Math.round(hours * 60))
        return this.$tc(`${scope}.minutes`, minutes, { count: minutes })
      }
      if (hours < 48) {
        const rounded = Math.round(hours)
        return this.$tc(`${scope}.hours`, rounded, { count: rounded })
      }
      const days = Math.round(hours / 24)
      return this.$tc(`${scope}.days`, days, { count: days })
    }
  }
}
</script>

<style lang="scss">
.storage-gauge-label {
  font-weight: 500;
}

.storage-gauge-ring-bar,
.storage-gauge-disk-bar {
  margin: 4px 0 2px 0;
}

.storage-gauge--dense {
  margin-top: 4px;
}

/* two segments side by side, the ring wider than the disk */
.storage-gauge-dense-bars {
  gap: 4px;
  max-width: 320px;
}

.storage-gauge-dense-bars .storage-gauge-ring-bar {
  flex: 3 1 0;
}

.storage-gauge-dense-bars .storage-gauge-disk-bar {
  flex: 2 1 0;
}

.storage-gauge-dense-line {
  font-size: 0.8125rem;
}
</style>
