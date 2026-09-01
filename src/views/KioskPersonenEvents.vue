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

    <v-dialog
      v-model="detailDialog"
      max-width="720"
      content-class="events-detail-dialog"
      :fullscreen="$vuetify.breakpoint.xsOnly"
    >
      <v-card v-if="selectedEvent" outlined class="events-detail-card">
        <v-card-title>
          <span class="text-truncate">{{ selectedEvent.subLabel || $t('page.kiosk.personenEvents.unknown') }}</span>
          <v-spacer></v-spacer>
          <v-btn
            icon
            class="events-detail-close"
            :title="$t('page.kiosk.personenEvents.close')"
            :aria-label="$t('page.kiosk.personenEvents.close')"
            @click="closeEvent"
          >
            <v-icon>close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div class="events-detail-time mb-2">
            {{ dateUtils.dateToShortDateTime(dateOf(selectedEvent), $i18n.locale) }}
            <span v-if="selectedEvent.zones.length">&mdash; {{ selectedEvent.zones.join(', ') }}</span>
          </div>
          <v-img
            v-if="showSnapshot"
            contain
            :src="snapshotUrl(selectedEvent)"
            class="events-detail-media mb-2"
            :class="{ 'events-detail-media--solo': mediaSolo }"
          ></v-img>
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
              :class="{ 'events-detail-media--solo': mediaSolo }"
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
import { Debouncer } from '@/utils/debouncer'

const PAGE_SIZE = 30
const CAMERA = 'keller'

export default {
  name: 'kioskPersonenEvents',

  components: {
    KioskLinkPanel
  },

  data: () => ({
    interval: null,
    debouncer: new Debouncer(),

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

  computed: {
    /**
     * A short viewport cannot hold the snapshot and the clip at a usable size, so
     * the still is what gives way - the clip's first frame is essentially the same
     * picture. `$vuetify.breakpoint` is reactive in both dimensions, so rotating or
     * resizing re-evaluates this while the dialog is open, and `v-if` (rather than
     * a CSS media query) also keeps v-img from fetching a snapshot nobody sees.
     * A clip that failed to load keeps the snapshot: dropping it there would leave
     * the dialog with no media at all.
     */
    showSnapshot () {
      if (!this.selectedEvent) {
        return false
      }
      const tight = this.$vuetify.breakpoint.xsOnly || this.$vuetify.breakpoint.height < 640
      return !(this.selectedEvent.hasClip && !this.clipError && tight)
    },

    // Only one media element on screen, so it may claim the whole body height
    // instead of the half-height budget the stacked case has to share.
    mediaSolo () {
      return !(this.showSnapshot && this.selectedEvent && this.selectedEvent.hasClip)
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

    /**
     * Folds a freshly read first page into `events` additively. An id already
     * present keeps its existing object: nothing is reassigned, so the
     * `:key`-ed DOM node survives, `v-img` does not re-fetch its thumbnail and
     * `selectedEvent` - which holds a reference into this array - keeps
     * pointing at a live entry while its dialog is open.
     * `hasMore` describes the tail of the list and this first-page query says
     * nothing about it, so it is deliberately left alone.
     * @param page events as getPastEvents() returns them, most-recent-first
     * @return how many entries were actually added
     */
    mergeEvents (page) {
      const known = new Set(this.events.map(event => event.id))
      let added = 0
      page.forEach(event => {
        if (known.has(event.id)) {
          return
        }
        known.add(event.id)
        // An event becomes listable when it *completes*, and completion order
        // is not start order - so an arrival goes in front of the first entry
        // that started before it rather than straight to the top.
        const at = this.events.findIndex(existing => existing.startTime < event.startTime)
        this.events.splice(at === -1 ? this.events.length : at, 0, event)
        added++
      })
      return added
    },

    // The first tile whose top edge is at or below the viewport top, i.e. the
    // topmost one the user can actually see whole. Rows share a top, so this
    // lands on a row's leading tile - the position a prepend is least likely
    // to reflow, which makes it the steadiest thing to hold still.
    topmostVisibleTile () {
      const tiles = this.$el ? this.$el.querySelectorAll('.events-card') : []
      return Array.prototype.find.call(tiles, tile => tile.getBoundingClientRect().top >= 0) || null
    },

    /**
     * One background tick: re-reads the first page under the current filters
     * and merges whatever is new. It deliberately touches none of `loading`,
     * `loadingMore` or `loadMoreError`, so nothing on screen flickers and a
     * "load more" in progress keeps its own state.
     *
     * `requestId` is captured but never incremented, which gives exactly the
     * wanted asymmetry: a filter change or a "load more" (both of which do
     * increment) invalidates a refresh in flight, while a refresh can never
     * invalidate a user-initiated load. Two overlapping refreshes are harmless
     * because the merge is idempotent.
     *
     * Re-reading the first page rather than asking only for events after the
     * newest shown `startTime` is what makes this self-healing: an event that
     * started earlier but completed later would never be returned by such a
     * query and would be lost for the life of the page.
     */
    async refreshEvents () {
      const requestId = this.requestId
      let page
      try {
        page = await frigateService.getPastEvents(CAMERA, this.buildFilters(), null, PAGE_SIZE)
      } catch (err) {
        // a hiccup at the detection source leaves `events`, `fetchError` and
        // `hasMore` exactly as they are - the list keeps standing and the next
        // tick supplies whatever completed meanwhile
        return
      }
      if (requestId !== this.requestId) {
        // a filter change or a "load more" already took over
        return
      }
      // After a failed *initial* load the page sits on the error card with an
      // empty list; the first refresh that succeeds is what lets the kiosk
      // recover by itself instead of staying stranded until someone touches it.
      this.fetchError = false

      // Read back in the running app (task 2.1): the events page has no inner
      // scroll container - #app, .v-main, .home and .events-content are all
      // `overflow-y: visible` and ignore a scrollTop, while <html> carries
      // `overflow-y: scroll` and is what window.scrollTo() moves. So
      // document.scrollingElement is the element to compensate on.
      //
      // What gets compensated is how far one anchor tile actually moved, not
      // how much the document grew. The two are not the same in a wrapping
      // grid: prepending a single tile mostly reflows the rows sideways - the
      // tile after it slides one column along and keeps its vertical position -
      // while the document still gains a whole row at the bottom. Measured at
      // 1024px (4 tiles per row) the height grew 226px for one arrival while
      // the tile the user was looking at had not moved at all, so adding that
      // delta back is what would drag the view off it. Only an arrival that
      // fills a row actually pushes the rows below down, and then the anchor
      // reports exactly that.
      //
      // The anchor is the topmost tile still in view; it survives the merge
      // because mergeEvents() never rebuilds an existing entry's node.
      const scroller = document.scrollingElement
      const anchor = scroller && scroller.scrollTop > 0 ? this.topmostVisibleTile() : null
      const anchorTop = anchor ? anchor.getBoundingClientRect().top : 0

      if (!this.mergeEvents(page)) {
        return
      }
      // At offset 0 there is no anchor and nothing is adjusted - there the
      // whole point is that the new tile becomes visible.
      if (anchor) {
        await this.$nextTick()
        scroller.scrollTop += anchor.getBoundingClientRect().top - anchorTop
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
    // Frigate has no push channel this app can reach (see design.md), so the
    // list keeps itself current by polling - same Debouncer + interval shape as
    // KioskMigrations.vue, and at the same 5s: a grid of completed events does
    // not need KioskPersonen's 2s, which is calibrated for bounding boxes
    // tracking a moving person.
    this.interval = setInterval(() => this.debouncer.debounce(async () => this.refreshEvents()), 5000)
  },

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
    }
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

/* Vuetify's own .v-dialog scrolls its whole content at max-height: 90%, which
   takes the actions row - and with it the close button - out of view. The
   dialog is pinned instead and the card owns the scrolling, so only the body
   between the title and the actions moves. Every override is qualified with
   the Vuetify class it is fighting: those rules carry inflated specificity and
   an unqualified selector would silently lose the cascade. */
.v-dialog.events-detail-dialog {
  overflow: hidden;
}

.v-card.events-detail-card {
  display: flex;
  flex-direction: column;
  max-height: 90vh;

  > .v-card__title,
  > .v-card__actions {
    flex: 0 0 auto;
  }

  > .v-card__text {
    flex: 1 1 auto;
    overflow-y: auto;
  }
}

/* fullscreen has no overlay margin to spare, so the card takes the lot */
.v-dialog--fullscreen .v-card.events-detail-card {
  height: 100%;
  max-height: 100%;
}

/* Height caps in vh rather than an aspect ratio: an aspect ratio derives the
   height from the width, which is exactly what lets a wide, short viewport
   blow the card open vertically.
   The subtracted constant is the card's own chrome - title, actions, card
   paddings and the timestamp line. That cost is in fixed pixels, so on a short
   viewport it eats a much larger share of the height than on a tall one; a
   plain `vh` cap ignores it and lands the body back in a scroll (measured at
   174px on a 1280x600 viewport, rounded up here for slack). The paired cap
   also gives up the 8px margin between the two media elements. */
$events-detail-chrome: 180px;

.events-detail-media {
  width: 100%;
  display: block;
  max-height: calc((90vh - #{$events-detail-chrome} - 8px) / 2);
  object-fit: contain;
}

.events-detail-media--solo {
  max-height: calc(90vh - #{$events-detail-chrome});
}

/* fullscreen spends no height on the overlay margin, so the budget is the
   whole viewport rather than the 90vh the floating card is capped at */
.v-dialog--fullscreen .events-detail-media {
  max-height: calc((100vh - #{$events-detail-chrome} - 8px) / 2);
}

.v-dialog--fullscreen .events-detail-media--solo {
  max-height: calc(100vh - #{$events-detail-chrome});
}

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
