<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap align-start">
      <v-container fluid class="events-content">
        <div class="text-h5 mb-2">{{ $t('page.kiosk.personenEvents.title') }}</div>

        <div class="events-filters d-flex flex-wrap align-center mb-4">
          <v-select
            v-model="nameFilter"
            :items="people"
            item-text="name"
            item-value="name"
            :label="$t('page.kiosk.personenEvents.filterName')"
            clearable
            dense
            outlined
            hide-details="auto"
            class="events-filter-name mr-4 mb-2"
          ></v-select>

          <div class="events-filter-date d-flex align-center mr-4 mb-2">
            <span class="events-date-label mr-2">{{ $t('page.kiosk.personenEvents.filterFrom') }}</span>
            <input
              type="datetime-local"
              v-model="fromLocal"
              class="events-date-input"
              :style="{ colorScheme: $vuetify.theme.dark ? 'dark' : 'light' }"
            />
            <v-btn icon x-small class="ml-1" @click="fromLocal = ''">
              <v-icon small>clear</v-icon>
            </v-btn>
          </div>

          <div class="events-filter-date d-flex align-center mb-2">
            <span class="events-date-label mr-2">{{ $t('page.kiosk.personenEvents.filterTo') }}</span>
            <input
              type="datetime-local"
              v-model="toLocal"
              class="events-date-input"
              :style="{ colorScheme: $vuetify.theme.dark ? 'dark' : 'light' }"
            />
            <v-btn icon x-small class="ml-1" @click="toLocal = ''">
              <v-icon small>clear</v-icon>
            </v-btn>
          </div>
        </div>

        <v-card v-if="fetchError" outlined color="error" class="pa-4 mb-4">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.personenEvents.fetchError') }}
        </v-card>
        <v-card v-else-if="!loading && events.length === 0" outlined class="pa-4 mb-4">
          {{ $t('page.kiosk.personenEvents.empty') }}
        </v-card>

        <v-row v-else dense>
          <v-col v-for="event in events" :key="event.id" cols="6" sm="4" md="3" lg="2">
            <v-card outlined class="events-card noFocus" @click="openEvent(event)">
              <v-img :src="thumbnailUrl(event)" aspect-ratio="1.7777" class="grey darken-4"></v-img>
              <v-card-text class="pa-2">
                <div class="events-card-name text-truncate">
                  {{ event.subLabel || $t('page.kiosk.personenEvents.unknown') }}
                </div>
                <div class="events-card-time">{{ dateUtils.dateToShortDateTime(dateOf(event), $i18n.locale) }}</div>
                <div v-if="event.zones.length" class="events-card-zones text-truncate">{{ event.zones.join(', ') }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card v-if="loadMoreError" outlined color="error" class="pa-4 mt-2 mb-4">
          {{ $t('page.kiosk.personenEvents.loadMoreError') }}
        </v-card>

        <div v-if="hasMore" class="d-flex justify-center mt-2 mb-4">
          <v-btn text :loading="loadingMore" @click="loadEvents(false)">
            {{ $t('page.kiosk.personenEvents.loadMore') }}
          </v-btn>
        </div>
      </v-container>
    </v-container>

    <KioskLinkPanel
      class="events-back-btn"
      :text="$t('page.kiosk.linkBack')"
      route="/app/kioskpersonen"
    ></KioskLinkPanel>

    <v-dialog v-model="detailDialog" max-width="720">
      <v-card v-if="selectedEvent" outlined>
        <v-card-title>
          {{ selectedEvent.subLabel || $t('page.kiosk.personenEvents.unknown') }}
        </v-card-title>
        <v-card-text>
          <div class="events-detail-time mb-2">
            {{ dateUtils.dateToShortDateTime(dateOf(selectedEvent), $i18n.locale) }}
            <span v-if="selectedEvent.zones.length">&mdash; {{ selectedEvent.zones.join(', ') }}</span>
          </div>
          <v-img :src="snapshotUrl(selectedEvent)" class="events-detail-media mb-2"></v-img>
          <div v-if="selectedEvent.hasClip">
            <div v-if="clipLoading" class="d-flex justify-center pa-4">
              <v-progress-circular indeterminate color="grey"></v-progress-circular>
            </div>
            <v-card v-if="clipError" outlined color="error" class="pa-4">
              {{ $t('page.kiosk.personenEvents.clipError') }}
            </v-card>
            <video
              v-show="clipBlobUrl && !clipLoading && !clipError"
              ref="clipVideo"
              controls
              class="events-detail-media"
              :src="clipBlobUrl"
            ></video>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeEvent">{{ $t('page.kiosk.personenEvents.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script type="js">
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import { singleton as frigateService } from '@/utils/webservices/frigateService'
import { singleton as doubleTakeService } from '@/utils/webservices/doubleTakeService'
import { singleton as dateUtils } from '@/utils/dateUtils'

const PAGE_SIZE = 30
const CAMERA = 'keller'

export default {
  name: 'kioskPersonenEvents',

  components: {
    KioskLinkPanel
  },

  data: () => ({
    events: [],
    loading: true,
    loadingMore: false,
    fetchError: false,
    loadMoreError: false,
    hasMore: false,

    people: [],

    nameFilter: null,
    fromLocal: '',
    toLocal: '',

    detailDialog: false,
    selectedEvent: null,
    clipBlobUrl: null,
    clipLoading: false,
    clipError: false,

    dateUtils,
    // guards a stale response from an earlier filter change writing over a
    // later one - same pattern as KioskMigrations.vue's loadAppliance()
    requestId: 0
  }),

  watch: {
    nameFilter () {
      this.loadEvents(true)
    },
    fromLocal () {
      this.loadEvents(true)
    },
    toLocal () {
      this.loadEvents(true)
    }
  },

  methods: {
    buildFilters () {
      return {
        name: this.nameFilter || null,
        after: this.epochFromLocal(this.fromLocal),
        before: this.epochFromLocal(this.toLocal)
      }
    },

    // datetime-local's value has no timezone suffix, so `new Date(...)` parses
    // it as local wall-clock time - the same moment the picker showed.
    epochFromLocal (value) {
      if (!value) {
        return null
      }
      const ms = new Date(value).getTime()
      return Number.isFinite(ms) ? Math.floor(ms / 1000) : null
    },

    dateOf (event) {
      return new Date(event.startTime * 1000)
    },

    thumbnailUrl (event) {
      return frigateService.getEventThumbnailUrl(event.id)
    },

    snapshotUrl (event) {
      return frigateService.getEventSnapshotUrl(event.id)
    },

    async loadPeople () {
      try {
        this.people = await doubleTakeService.getPeople()
      } catch (err) {
        // the name filter simply stays empty; the event list itself still loads
      }
    },

    async loadEvents (reset) {
      const requestId = ++this.requestId
      if (reset) {
        this.loading = true
        this.fetchError = false
      } else {
        this.loadingMore = true
        this.loadMoreError = false
      }
      const cursor = reset ? null : (this.events.length ? this.events[this.events.length - 1].startTime : null)
      try {
        const page = await frigateService.getPastEvents(CAMERA, this.buildFilters(), cursor, PAGE_SIZE)
        if (requestId !== this.requestId) {
          // a newer filter change or load-more call already took over
          return
        }
        this.events = reset ? page : this.events.concat(page)
        this.hasMore = page.length >= PAGE_SIZE
      } catch (err) {
        if (requestId !== this.requestId) {
          return
        }
        if (reset) {
          this.fetchError = true
          this.events = []
          this.hasMore = false
        } else {
          this.loadMoreError = true
        }
      }
      if (requestId === this.requestId) {
        this.loading = false
        this.loadingMore = false
      }
    },

    openEvent (event) {
      this.selectedEvent = event
      this.detailDialog = true
      this.releaseClipBlob()
      if (event.hasClip) {
        this.loadClipBlob(event)
      }
    },

    closeEvent () {
      this.detailDialog = false
      this.releaseClipBlob()
    },

    /**
     * The clip endpoint sends no `Accept-Ranges`/206 support and `cache-control: no-store`
     * (confirmed against the running instance), so letting <video> stream it progressively
     * forces Chrome's media pipeline to re-request from byte 0 whenever it needs to extend a
     * buffer it can't fetch a range for, which is what produced the recurring ~1s playback
     * stutter. Clips are short enough (a few MB) that fetching the whole thing up front into a
     * Blob and playing from that local object URL avoids the streaming path entirely.
     */
    async loadClipBlob (event) {
      this.clipLoading = true
      this.clipError = false
      const requestedId = event.id
      try {
        const response = await fetch(frigateService.getEventClipUrl(event.id))
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const blob = await response.blob()
        // a close/reopen while the fetch was in flight must not attach a stale
        // clip to whatever event dialog is on screen now
        if (!this.selectedEvent || this.selectedEvent.id !== requestedId) {
          return
        }
        this.releaseClipBlob()
        this.clipBlobUrl = URL.createObjectURL(blob)
        this.playClipWhenReady()
      } catch (err) {
        if (this.selectedEvent && this.selectedEvent.id === requestedId) {
          this.clipError = true
        }
      }
      if (this.selectedEvent && this.selectedEvent.id === requestedId) {
        this.clipLoading = false
      }
    },

    // The dialog opened from a real click, so this still counts as
    // gesture-initiated as far down the promise chain as this - Chrome just
    // blocks it if too much time or too many awaits have passed. Falling
    // back to a muted play() covers that case: the clip starts moving
    // instead of sitting on the first frame waiting for a manual tap.
    async playClipWhenReady () {
      await this.$nextTick()
      const video = this.$refs.clipVideo
      if (!video) {
        return
      }
      // The <video> element is kept mounted across opens (v-show, not v-if)
      // so a fresh decoder isn't spun up on every click; load() forces it to
      // pick up the new `src` that just landed on the still-mounted element.
      video.load()
      try {
        await video.play()
      } catch (err) {
        video.muted = true
        video.play().catch(() => {})
      }
    },

    releaseClipBlob () {
      if (this.clipBlobUrl) {
        URL.revokeObjectURL(this.clipBlobUrl)
        this.clipBlobUrl = null
      }
    }
  },

  mounted () {
    // Kiosk mode is already sticky by the time a user reaches this page via
    // the "Events" button on KioskPersonen, so unlike the primary kiosk
    // dashboards this view does not call kioskMode(true) itself (same
    // rationale as KioskPersonenVerwaltung.vue / KioskMigrations.vue).
    this.loadPeople()
    this.loadEvents(true)
  },

  beforeDestroy () {
    this.releaseClipBlob()
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.events-content {
  max-width: none;
  /* the back button is fixed over the bottom left corner: keep the grid
     clear of it, same padding convention as personen-verwaltung-content */
  padding: 8px 8px 100px 8px;
}

.events-filter-name {
  max-width: 220px;
}

.events-date-label {
  font-size: 14px;
  opacity: 0.8;
}

.events-date-input {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  color: inherit;
  padding: 4px 8px;
  font-size: 14px;
}

.events-card {
  cursor: pointer;
}

.events-card-name {
  font-weight: 500;
}

.events-card-time,
.events-card-zones {
  font-size: 12px;
  opacity: 0.8;
}

.events-back-btn {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 20;
}

.events-detail-media {
  width: 100%;
  display: block;
}

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
