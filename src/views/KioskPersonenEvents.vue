<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap align-start">
      <v-container
        fluid
        class="events-content"
        :class="{ 'events-content--with-timeline': showTimeline }"
      >
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

          <div class="events-filter-quick d-flex align-center flex-wrap mb-2">
            <span class="events-date-label mr-2">{{ $t('page.kiosk.personenEvents.quickRangeLabel') }}</span>
            <v-btn
              v-for="range in quickRanges"
              :key="range.hours"
              small
              outlined
              class="events-quick-btn mr-1"
              @click="applyQuickRange(range)"
            >
              {{ quickRangeText(range) }}
            </v-btn>
          </div>
        </div>

        <v-card v-if="camerasError" outlined color="error" class="pa-4 mb-4">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.personenEvents.registryError') }}
        </v-card>
        <v-card v-else-if="!camerasLoading && cameras.length === 0" outlined class="pa-4 mb-4">
          <div class="mb-2">{{ $t('page.kiosk.personenEvents.noCamera') }}</div>
          <KioskLinkPanel
            :text="$t('page.kiosk.linkCameras')"
            route="/app/kioskcameras"
          ></KioskLinkPanel>
        </v-card>
        <v-card v-else-if="fetchError" outlined color="error" class="pa-4 mb-4">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.personenEvents.fetchError') }}
        </v-card>
        <v-card v-else-if="!loading && events.length === 0" outlined class="pa-4 mb-4">
          {{ $t('page.kiosk.personenEvents.empty') }}
        </v-card>

        <v-card
          v-if="unreachableCameras.length"
          outlined
          color="warning"
          class="pa-4 mb-4 events-partial-failure"
        >
          <v-icon left>warning</v-icon>
          {{ $t('page.kiosk.personenEvents.partialFailure', { cameras: unreachableCameras.join(', ') }) }}
        </v-card>

        <v-row v-if="events.length" dense>
          <v-col v-for="event in events" :key="event.id" cols="6" sm="4" md="3" lg="2">
            <v-card
              outlined
              class="events-card noFocus"
              :class="{ 'events-card--highlighted': event.id === highlightedId }"
              @click="openEvent(event)"
            >
              <v-img :src="thumbnailUrl(event)" aspect-ratio="1.7777" class="grey darken-4"></v-img>
              <v-card-text class="pa-2">
                <div class="events-card-name text-truncate">
                  {{ event.subLabel || $t('page.kiosk.personenEvents.unknown') }}
                </div>
                <div class="events-card-time">{{ dateUtils.dateToShortDateTime(dateOf(event), $i18n.locale) }}</div>
                <div v-if="cameras.length > 1" class="events-card-camera text-truncate">{{ cameraName(event) }}</div>
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

    <EventsTimeline
      v-if="showTimeline"
      :events="events"
      :axis-start="axisStart()"
      :axis-end="axisEnd()"
      :highlighted-id="highlightedId"
      :label="$t('page.kiosk.personenEvents.timelineLabel')"
      @activate="revealEvent"
    ></EventsTimeline>

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
            <span v-if="cameras.length > 1">&mdash; {{ cameraName(selectedEvent) }}</span>
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
import EventsTimeline from '@/components/EventsTimeline.vue'
import { singleton as frigateService } from '@/utils/webservices/frigateService'
import { singleton as camerasService } from '@/utils/webservices/camerasService'
import { singleton as doubleTakeService } from '@/utils/webservices/doubleTakeService'
import { singleton as dateUtils } from '@/utils/dateUtils'
import { Debouncer } from '@/utils/debouncer'

const PAGE_SIZE = 30

const HOUR = 60 * 60 * 1000

// Each range only ever writes into the existing "from" field, so there is no
// "selected range" to keep in sync - the controls show what is active because
// they *are* what is active, and a hand-edit afterwards is just another write
// to the same field. `days` picks the plural form; `hours` is what counts.
const QUICK_RANGES = [
  { hours: 2 },
  { hours: 12 },
  { hours: 24 },
  { hours: 24 * 7, days: 7 }
]
const DEFAULT_RANGE = QUICK_RANGES[0]

/**
 * The exact inverse of the view's `epochFromLocal()`: builds the
 * `YYYY-MM-DDTHH:mm` local wall-clock string a `datetime-local` input takes.
 * `Date.toISOString()` is UTC and would seed a range shifted by the timezone
 * offset - in this project's timezone, silently the wrong two hours - and
 * `dateUtils` has no such formatter, only locale display strings. It is a
 * module-level function rather than a method because `data()` needs it before
 * an instance exists.
 */
const localFromDate = date =>
  `${date.getFullYear()}-${dateUtils.pad(date.getMonth() + 1)}-${dateUtils.pad(date.getDate())}` +
  `T${dateUtils.pad(date.getHours())}:${dateUtils.pad(date.getMinutes())}`

/**
 * The viewport below which the timeline gives way to the grid.
 *
 * Measured in the running app rather than reasoned from the stylesheet (task
 * 4.3), by applying the reserved padding by hand at every width and reading the
 * tile boxes back. The reference the measurement is judged against is the grid's
 * own floor: unaided, at a 360px viewport, it already renders 156px tiles. The
 * 56px the timeline costs takes the tiles to
 *   600px -> 165px (3/row)   480px -> 192px   420px -> 162px
 *   400px -> 152px           380px -> 142px   360px -> 132px
 * so 420px is where the tiles stop clearing that floor, and it is the threshold.
 *
 * Vuetify's own xs/sm boundary (600px) was the obvious candidate and the
 * measurement rejected it: the tightest tile in the entire range - 165px - sits
 * *at* 600px, where the grid still runs three columns, while 580px down to 420px
 * is roomier (242px .. 162px) because the grid has dropped to two. The boundary
 * therefore does not describe the constraint; the tile floor does.
 */
const TIMELINE_MIN_WIDTH = 420

// how far below the viewport top a tile reached from the timeline is parked
const REVEAL_MARGIN = 16

export default {
  name: 'kioskPersonenEvents',

  components: {
    KioskLinkPanel,
    EventsTimeline
  },

  data: () => ({
    interval: null,
    debouncer: new Debouncer(),

    // Which cameras this page covers is a setting in the registry, not a
    // constant: every camera flagged for the events page, in the configured
    // order.
    cameras: [],
    camerasLoading: true,
    camerasError: false,
    // display names of the cameras whose events could not be read on the last
    // load; the list keeps standing for the ones that could
    unreachableCameras: [],

    events: [],
    loading: true,
    loadingMore: false,
    fetchError: false,
    loadMoreError: false,
    hasMore: false,

    people: [],

    nameFilter: null,
    // Seeded here, not in mounted(): Vue fires no watcher for a property's
    // initial value, so mounted()'s single loadEvents(true) stays the only
    // load. Writing it in mounted() would fire the fromLocal watcher into a
    // second loadEvents(true) racing the first, resolved only by requestId.
    // `toLocal` stays empty on purpose - see applyQuickRange().
    fromLocal: localFromDate(new Date(Date.now() - DEFAULT_RANGE.hours * HOUR)),
    toLocal: '',

    quickRanges: QUICK_RANGES,
    // the event whose mark was last activated on the timeline; an id rather
    // than an element reference, so it survives mergeEvents()
    highlightedId: null,

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
    // The two close buttons are not the only way out of the dialog: Escape and
    // a click on the backdrop are handled by v-dialog itself and only write
    // `false` through the v-model. The flag is therefore the one thing every
    // closing path has in common, which is why the clip teardown hangs off it
    // rather than off the click handlers.
    detailDialog (open) {
      if (!open) {
        this.stopClip()
      }
    },
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
    },

    // `$vuetify.breakpoint.width` is reactive, so rotating or resizing brings
    // the timeline back or takes it away together with the grid padding that
    // reserves its column.
    showTimeline () {
      return this.$vuetify.breakpoint.width >= TIMELINE_MIN_WIDTH
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
    // Its inverse is the module-level localFromDate(), which is what every
    // write *into* these inputs goes through.
    epochFromLocal (value) {
      if (!value) {
        return null
      }
      const ms = new Date(value).getTime()
      return Number.isFinite(ms) ? Math.floor(ms / 1000) : null
    },

    quickRangeText (range) {
      return range.days
        ? this.$t('page.kiosk.personenEvents.quickRangeDays', { count: range.days })
        : this.$t('page.kiosk.personenEvents.quickRangeHours', { count: range.hours })
    },

    /**
     * A range ending "at the present" is an *open* upper bound, not
     * `toLocal = now`: buildFilters() feeds `toLocal` into `filters.before`
     * and refreshEvents() reuses those filters every 5s, so an upper bound
     * pinned at the moment the button was pressed would filter out precisely
     * the events the live refresh exists to deliver. Left open, the range also
     * keeps meaning "the last two hours" as time passes.
     * `toLocal` is only written when it actually holds something, so the usual
     * case costs one watcher and one request rather than two.
     */
    applyQuickRange (range) {
      if (this.toLocal) {
        this.toLocal = ''
      }
      this.fromLocal = localFromDate(new Date(Date.now() - range.hours * HOUR))
    },

    /**
     * The bottom of the timeline axis: the active "from", or - when the range
     * is open at that end - the oldest event actually listed, `events` being
     * most-recent-first. With neither, the axis is given an hour so it still
     * stands (without marks) instead of collapsing.
     */
    axisStart () {
      const from = this.epochFromLocal(this.fromLocal)
      if (from !== null) {
        return from
      }
      return this.events.length ? this.events[this.events.length - 1].startTime : this.axisEnd() - 3600
    },

    /**
     * The top of the axis: the active "to", or *now* when that bound is open.
     * Deliberately a method rather than state - `now` is read as the view
     * renders, so the axis follows the clock without a timer rewriting a data
     * property under the user.
     */
    axisEnd () {
      const to = this.epochFromLocal(this.toLocal)
      return to !== null ? to : Math.floor(Date.now() / 1000)
    },

    /**
     * Activating a mark on the timeline: highlight the event's tile and bring
     * it into view. It deliberately does not open the event - that stays a
     * click on the tile itself.
     *
     * The scroll goes through `document.scrollingElement` and a
     * `getBoundingClientRect()` measurement, the same element and the same
     * measurement refreshEvents()'s anchor compensation uses, so the two agree
     * about what "scroll position" means. `Element.scrollIntoView()` on a
     * smooth setting would still be animating when the next 5s refresh
     * corrects `scrollTop` underneath it, which is how the two would visibly
     * fight.
     * A tile that is already fully in view is left where it is: the highlight
     * alone answers "which one is it", and scrolling to it anyway would move
     * the grid out from under the user for no reason.
     */
    async revealEvent (id) {
      this.highlightedId = id
      await this.$nextTick()
      const index = this.events.findIndex(event => event.id === id)
      const tiles = this.$el ? this.$el.querySelectorAll('.events-card') : []
      const tile = index === -1 ? null : tiles[index]
      const scroller = document.scrollingElement
      if (!tile || !scroller) {
        return
      }
      const rect = tile.getBoundingClientRect()
      if (rect.top >= REVEAL_MARGIN && rect.bottom <= window.innerHeight) {
        return
      }
      scroller.scrollTop += rect.top - REVEAL_MARGIN
    },

    dateOf (event) {
      return new Date(event.startTime * 1000)
    },

    thumbnailUrl (event) {
      return frigateService.getEventThumbnailUrl(event.camera, event.id)
    },

    snapshotUrl (event) {
      return frigateService.getEventSnapshotUrl(event.camera, event.id)
    },

    cameraName (event) {
      const camera = this.cameras.find(candidate => candidate.id === event.camera)
      return camera ? camera.displayName : ''
    },

    async loadCameras () {
      this.camerasLoading = true
      this.camerasError = false
      try {
        this.cameras = await camerasService.getCamerasForEventsPage()
      } catch (err) {
        this.camerasError = true
        this.cameras = []
      }
      this.camerasLoading = false
    },

    /**
     * One page across every configured camera, merged into a single list
     * ordered by time. Each camera is asked separately - overmind's event route
     * addresses one camera - which is also what makes partial failure
     * expressible: a camera whose node is down takes only its own events out of
     * the list and its name into `unreachableCameras`, instead of failing the
     * whole listing.
     * @param cursor the `startTime` to page back from, or null for the first page
     */
    async fetchPage (cursor) {
      const results = await Promise.all(this.cameras.map(async camera => {
        try {
          return { camera, events: await frigateService.getPastEvents(camera.id, this.buildFilters(), cursor, PAGE_SIZE) }
        } catch (err) {
          return { camera, events: null }
        }
      }))
      const reached = results.filter(result => result.events !== null)
      return {
        page: reached
          .reduce((all, result) => all.concat(result.events), [])
          .sort((a, b) => b.startTime - a.startTime),
        failed: results.filter(result => result.events === null).map(result => result.camera.displayName),
        // any camera that filled its page may still have older events
        full: reached.some(result => result.events.length >= PAGE_SIZE),
        allFailed: reached.length === 0
      }
    },

    /**
     * Appends a page, skipping what is already listed. The cameras page back
     * against one shared cursor but hold events at different times, so a page
     * can carry entries an earlier one already delivered.
     */
    appendEvents (page) {
      const known = new Set(this.events.map(event => event.id))
      this.events = this.events
        .concat(page.filter(event => !known.has(event.id)))
        .sort((a, b) => b.startTime - a.startTime)
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
      if (!this.cameras.length) {
        // nothing to ask; the page shows its no-camera state instead
        this.loading = false
        this.loadingMore = false
        return
      }
      if (reset) {
        this.loading = true
        this.fetchError = false
        // The list is about to be replaced wholesale, so a highlight pointing
        // into the old one is dropped rather than left dangling on an event a
        // filter change may well have removed.
        this.highlightedId = null
      } else {
        this.loadingMore = true
        this.loadMoreError = false
      }
      const cursor = reset ? null : (this.events.length ? this.events[this.events.length - 1].startTime : null)
      const { page, failed, full, allFailed } = await this.fetchPage(cursor)
      if (requestId !== this.requestId) {
        // a newer filter change or load-more call already took over
        return
      }
      if (allFailed) {
        if (reset) {
          this.fetchError = true
          this.events = []
          this.hasMore = false
        } else {
          this.loadMoreError = true
        }
      } else {
        this.unreachableCameras = failed
        if (reset) {
          this.events = page
        } else {
          this.appendEvents(page)
        }
        this.hasMore = full
      }
      this.loading = false
      this.loadingMore = false
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
      if (!this.cameras.length) {
        return
      }
      const requestId = this.requestId
      const { page, failed, allFailed } = await this.fetchPage(null)
      if (allFailed) {
        // a hiccup at the detection source leaves `events`, `fetchError` and
        // `hasMore` exactly as they are - the list keeps standing and the next
        // tick supplies whatever completed meanwhile
        return
      }
      if (requestId !== this.requestId) {
        // a filter change or a "load more" already took over
        return
      }
      this.unreachableCameras = failed
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
    },

    /**
     * The <video> is kept mounted across opens and the dialog's card stays
     * rendered once shown, so a closed dialog is a hidden element that is still
     * playing - revoking the blob URL does nothing to media that is already
     * loaded, which is why closing used to leave the clip audible.
     * Detaching the source (rather than assigning '', which resolves to the
     * page URL and fires a real failed request) is what makes the element let
     * go of the buffered clip; the URL can only be revoked afterwards.
     */
    stopClip () {
      const video = this.$refs.clipVideo
      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
      this.releaseClipBlob()
    },

    /**
     * The clip endpoint sends no `Accept-Ranges`/206 support and `cache-control: no-store`
     * (confirmed against the running instance), so letting <video> stream it progressively
     * forces Chrome's media pipeline to re-request from byte 0 whenever it needs to extend a
     * buffer it can't fetch a range for, which is what produced the recurring ~1s playback
     * stutter. Clips are short enough (a few MB) that fetching the whole thing up front into a
     * Blob and playing from that local object URL avoids the streaming path entirely.
     *
     * OPEN, and known: overmind will serve clips as HLS rather than MP4, because the same
     * measurement upstream (Frigate 0.17.2 answers a Range request with the whole body) means
     * seeking only works through the VOD playlist. A `.m3u8` cannot be played out of a Blob,
     * so this path needs an HLS-capable player once media routing ships - it is not merely a
     * URL change. Nothing to do before then: those routes do not exist yet.
     * See ai/draft-cameras-for-frontend.md section 7 in java-overmind-server.
     */
    async loadClipBlob (event) {
      this.clipLoading = true
      this.clipError = false
      const requestedId = event.id
      try {
        const response = await fetch(frigateService.getEventClipUrl(event.camera, event.id))
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
        video.play().catch(() => {
          // Muted playback was refused as well, so there is nothing left to
          // try: the clip stays on its first frame until the user taps it.
        })
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
    this.loadCameras().then(() => this.loadEvents(true))
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
    // Leaving the page unmounts the component without ever flipping
    // `detailDialog`, so the watcher does not run here - a clip playing at
    // that moment has to be stopped through the same teardown.
    this.stopClip()
  }
}
</script>

<style lang="scss">
@import 'index.scss';

/* The timeline is fixed against the viewport rather than sticky inside the
   grid column: the page scrolls <html> (refreshEvents() records the read-back),
   so a sticky element here has no scrolling ancestor to stick within and would
   simply scroll away. Same shape .events-back-btn already uses for the bottom
   left corner.
   The width is a two-place contract - the strip itself and the padding that
   keeps the rightmost tile column out from under it - so both come off this
   one variable, as $events-detail-chrome already does for the dialog. */
$events-timeline-width: 56px;

.events-content {
  max-width: none;
  /* the back button is fixed over the bottom left corner: keep the grid
     clear of it, same padding convention as personen-verwaltung-content */
  padding: 8px 8px 100px 8px;
}

/* Qualified with Vuetify's own .container, which owns the padding this is
   correcting; an unqualified selector ties on specificity and wins or loses
   on source order alone. The modifier only exists while the timeline does, so
   the reserved column disappears with it on a narrow viewport. */
.container.events-content--with-timeline {
  padding-right: $events-timeline-width;
}

.events-timeline {
  position: fixed;
  top: 0;
  right: 0;
  width: $events-timeline-width;
  height: 100vh;
  z-index: 20;
}

/* .v-card--outlined's border is what this replaces, so the rule is qualified
   with .v-card to clear that specificity. */
.v-card.events-card--highlighted {
  border-color: var(--v-primary-base, #1976d2);
  box-shadow: 0 0 0 2px var(--v-primary-base, #1976d2);
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
.events-card-camera,
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
