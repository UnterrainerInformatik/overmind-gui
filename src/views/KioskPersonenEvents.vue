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
            v-if="cameras.length > 1"
            v-model="cameraFilter"
            :items="cameraItems"
            :label="$t('page.kiosk.personenEvents.filterCamera')"
            dense
            outlined
            hide-details="auto"
            class="events-filter-camera mr-4 mb-2"
          ></v-select>

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
            <EventTile
              :entry="event"
              :highlighted="event.id === highlightedId"
              :camera-name="cameras.length > 1 ? cameraName(event) : ''"
              :marker="archiveMarker(event)"
              @select="openEvent"
            ></EventTile>
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

    <EventMediaDialog
      v-model="detailDialog"
      :entry="selectedEvent"
      :media="selectedMedia"
      :subtitle="detailSubtitle"
      :note="archiveNote"
      :note-tone="selectedArchive ? selectedArchive.state : ''"
    >
      <template #state>
        <div
          v-if="selectedArchive"
          class="events-archive-state"
          :class="{ 'events-archive-state--failed': selectedArchive.state === 'failed' }"
        >
          <v-icon small class="mr-1">{{ selectedArchive.state === 'failed' ? 'error_outline' : 'bookmark' }}</v-icon>
          <span class="events-archive-state-text">{{ archiveStateText }}</span>
          <span v-if="originExpiresText" class="events-archive-origin ml-2">{{ originExpiresText }}</span>
        </div>
      </template>
      <template #actions>
        <v-btn
          v-if="!selectedArchive"
          text
          class="events-archive-save"
          :loading="archiveSaving"
          @click="saveToArchive"
        >{{ $t('page.kiosk.personenEvents.archiveSave') }}</v-btn>
        <!-- An entry this view inserted itself carries no `originExpiresAt`,
             so what releasing it means cannot be read yet: the control waits
             for the index read that replaces it, a tick away at most. And
             once that is read, the release is offered only while the original
             is still held - see releaseOffered(). -->
        <v-btn
          v-else-if="releaseOffered"
          text
          class="events-archive-release"
          :loading="archiveReleasing"
          @click="requestRelease"
        >{{ releaseLabel }}</v-btn>
        <!-- Offered on every event the dialog can play, saved or not, and
             guarded by its confirmation alone: this GUI holds no identity it
             could check a role against, and a check against an absent one
             would be a claim of protection rather than a protection. -->
        <v-btn
          text
          color="error"
          class="events-delete"
          :loading="deleting"
          @click="requestDelete"
        >{{ $t('page.kiosk.personenEvents.deleteAction') }}</v-btn>
      </template>
    </EventMediaDialog>

    <!-- One instance, not two: `confirmText` is a prop rather than an argument
         of open(), so the wording the pending action carries is bound to
         `pendingAction` instead of being passed in. A second instance for the
         delete would only invite a third. -->
    <ConfirmDialog
      ref="confirmDialog"
      :confirmText="confirmActionText"
      :cancelText="$t('page.kiosk.personenEvents.cancel')"
    ></ConfirmDialog>
  </div>
</template>

<script type="js">
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import EventsTimeline from '@/components/EventsTimeline.vue'
import EventTile from '@/components/EventTile.vue'
import EventMediaDialog from '@/components/EventMediaDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { singleton as frigateService } from '@/utils/webservices/frigateService'
import { singleton as archiveService } from '@/utils/webservices/archiveService'
import { singleton as camerasService } from '@/utils/webservices/camerasService'
import { singleton as doubleTakeService } from '@/utils/webservices/doubleTakeService'
import { singleton as dateUtils } from '@/utils/dateUtils'
import { deleteRecording } from '@/utils/recordingDeletion'
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
    EventsTimeline,
    EventTile,
    EventMediaDialog,
    ConfirmDialog
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

    // null is every configured camera, which is what the page opens with;
    // a camera id narrows every read to that one camera - see
    // filteredCameraIds().
    cameraFilter: null,
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

    // The archive's own index, keyed by the event each entry was made from.
    // A second map rather than a flag on the events: the join is what answers
    // "is this one already saved?", and keeping it beside `events` means
    // nothing about the list, its merge or its scroll anchoring changes with
    // it. An absent archive simply leaves it empty.
    archiveByEventId: {},
    archiveSaving: false,
    archiveReleasing: false,
    deleting: false,
    // what the one ConfirmDialog is currently asking about:
    // { kind: 'unsave' | 'delete-everywhere', item, event }. The dialog's own
    // labels are computed off this, because it takes them as props.
    pendingAction: null,

    dateUtils,
    // guards a stale response from an earlier filter change writing over a
    // later one - same pattern as KioskMigrations.vue's loadAppliance()
    requestId: 0
  }),

  watch: {
    cameraFilter () {
      this.loadEvents(true)
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
    /** "All cameras" first, then the configured ones in registry order. */
    cameraItems () {
      return [{ value: null, text: this.$t('page.kiosk.personenEvents.allCameras') }]
        .concat(this.cameras.map(camera => ({ value: camera.id, text: camera.displayName })))
    },

    /**
     * The line under the dialog's title: when the event happened, and - where
     * there is more than one camera or any zone - where. The dialog is handed
     * the finished sentence rather than the event, because which camera a
     * camera id names is this page's registry read.
     */
    detailSubtitle () {
      const event = this.selectedEvent
      if (!event) {
        return ''
      }
      const parts = [dateUtils.dateToShortDateTime(this.dateOf(event), this.$i18n.locale)]
      if (this.cameras.length > 1) {
        parts.push(this.cameraName(event))
      }
      if (event.zones.length) {
        parts.push(event.zones.join(', '))
      }
      return parts.join(' \u2014 ')
    },

    /** The archive entry of the event whose dialog is open, or null. */
    selectedArchive () {
      return this.archiveOf(this.selectedEvent)
    },

    /** Which media the open dialog plays - see mediaOf(). */
    selectedMedia () {
      return this.mediaOf(this.selectedEvent)
    },

    // "Saved", or the failure - an entry the server reports as failed is not a
    // safely saved event and must not read like one.
    archiveStateText () {
      if (!this.selectedArchive) {
        return ''
      }
      return this.selectedArchive.state === 'failed'
        ? this.$t('page.kiosk.personenEvents.archiveFailed')
        : this.$t('page.kiosk.personenEvents.archiveSaved')
    },

    /**
     * What is worth saying about the copy under the media: that it is still
     * being prepared, or why it failed. Both cases keep the source's own media
     * on screen, so the note explains what is playing rather than replacing it.
     */
    archiveNote () {
      const item = this.selectedArchive
      if (!item) {
        return ''
      }
      if (item.state === 'pending') {
        return this.$t('page.kiosk.personenEvents.archivePreparing')
      }
      if (item.state === 'failed') {
        return this.$t('page.kiosk.personenEvents.archiveFailedNote', { reason: item.failureReason || '' })
      }
      return ''
    },

    /**
     * How much longer the original is held at its source, whenever the server
     * states it at all. The fact, beside the wording that was derived from it -
     * which is what a user near the 24h boundary needs to see.
     */
    originExpiresText () {
      const item = this.selectedArchive
      if (!item || item.originExpiresAt === null || item.originExpiresAt === undefined) {
        return ''
      }
      return this.$t('page.kiosk.personenEvents.archiveOriginUntil', {
        moment: dateUtils.dateToShortDateTime(new Date(item.originExpiresAt * 1000), this.$i18n.locale)
      })
    },

    /**
     * Whether releasing still has a meaning of its own. It has one only while
     * the original is still held at its source: below that, "release the copy"
     * and "delete the recording" are the same act, and the permanent delete
     * beside it is the control that says so. An entry this view inserted itself
     * states no `originExpiresAt` yet and waits for the index read.
     */
    releaseOffered () {
      const item = this.selectedArchive
      return !!item && !item.local && archiveService.releaseKind(item) === 'unsave'
    },

    // One wording rather than a pair to pick from: the control is only ever on
    // screen for the case it describes - see releaseOffered().
    releaseLabel () {
      return this.$t('page.kiosk.personenEvents.archiveReleaseUnsave')
    },

    // Computed off `pendingAction`, because ConfirmDialog takes its labels as
    // props: one instance cannot be handed a different confirm label per call.
    confirmActionText () {
      return this.pendingAction && this.pendingAction.kind === 'delete-everywhere'
        ? this.$t('page.kiosk.personenEvents.deleteAction')
        : this.$t('page.kiosk.personenEvents.archiveReleaseUnsave')
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

    /** Which cameras to ask about: the chosen one, or all configured ones. */
    filteredCameraIds () {
      return this.cameraFilter === null
        ? this.cameras.map(camera => camera.id)
        : [this.cameraFilter]
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
     * One page across the cameras the filter covers - every configured one
     * unless a single camera is selected. Narrowing the *request* rather than
     * the rendered list is what keeps `hasMore`, the paging cursor and the
     * partial-failure notice describing what is actually on screen: PAGE_SIZE
     * is applied by the server over the merged stream, so a page filtered
     * afterwards would arrive nearly empty. Overmind merges them itself -
     * one request per node rather than one per camera - and answers a node it
     * cannot reach with a named gap instead of a failed call, which is what
     * makes partial failure expressible: that camera's events are missing, its
     * name goes into `unreachableCameras`, and the rest of the list stands.
     * Only when no camera at all answered is there nothing to show.
     * @param cursor the `startTime` to page back from, or null for the first page
     */
    async fetchPage (cursor) {
      const ids = this.filteredCameraIds()
      try {
        const page = await frigateService.getPastEvents(ids, this.buildFilters(), cursor, PAGE_SIZE)
        return {
          page: page.events,
          failed: page.unavailable.map(entry => this.unavailableName(entry)),
          // the filters are the server's, so a full page is a full page: there
          // is nothing left here that could take entries back out of it
          full: page.events.length >= PAGE_SIZE,
          allFailed: page.unavailable.length >= ids.length
        }
      } catch (err) {
        return { page: [], failed: [], full: false, allFailed: true }
      }
    },

    /**
     * What to call a camera whose events could not be read. The registry entry
     * this page already holds is the first source, because the server can only
     * name a camera it knows - an id it does not know has no display name at
     * all, and an id is still better than an unexplained gap.
     */
    unavailableName (entry) {
      const camera = this.cameras.find(candidate => candidate.id === entry.cameraId)
      return (camera && camera.displayName) || entry.displayName || `#${entry.cameraId}`
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

    /** The archive entry made from an event, or null - the join, in one place. */
    archiveOf (event) {
      return (event && this.archiveByEventId[event.id]) || null
    },

    /**
     * What EventTile draws over an event's thumbnail, or null for nothing: the
     * saved badge, or the failure. The wording stays here - the tile knows only
     * that there is a marker - because "gesichert" is a sentence about this
     * page's subject.
     */
    archiveMarker (event) {
      const item = this.archiveOf(event)
      if (!item) {
        return null
      }
      const failed = item.state === 'failed'
      return {
        icon: failed ? 'error_outline' : 'bookmark',
        tone: failed ? 'failed' : 'saved',
        title: failed
          ? this.$t('page.kiosk.personenEvents.archiveFailed')
          : this.$t('page.kiosk.personenEvents.archiveSaved')
      }
    },

    /**
     * Which media the dialog plays for an event: the archived copy once it is
     * `ready`, the source's own otherwise. One path, so the day the original
     * expires nothing on screen changes - and a copy that is still `pending` or
     * has `failed` keeps the source's media rather than leaving the dialog
     * empty.
     */
    mediaOf (event) {
      const item = this.archiveOf(event)
      if (item && item.state === 'ready' && (item.clipUrl || item.snapshotUrl)) {
        return {
          hasClip: !!item.clipUrl,
          clipUrl: item.clipUrl,
          snapshotUrl: item.snapshotUrl
        }
      }
      return {
        hasClip: !!(event && event.hasClip),
        clipUrl: (event && event.clipUrl) || '',
        snapshotUrl: (event && event.snapshotUrl) || ''
      }
    },

    /**
     * The window the archive index is read for: what the list actually spans,
     * not what the filter allows. An unbounded filter would otherwise ask for
     * the whole archive on every 5s tick.
     * `after` is the oldest listed event's start time less a second, because
     * the bound is exclusive and an archive entry carries its source event's
     * own start time - asked for exactly, the oldest tile would be the one
     * event that could never show its marker.
     */
    archiveWindow () {
      const oldest = this.events.length ? this.events[this.events.length - 1].startTime : null
      return {
        after: oldest !== null ? oldest - 1 : this.epochFromLocal(this.fromLocal),
        before: this.epochFromLocal(this.toLocal)
      }
    },

    /**
     * Re-reads the archive index for what the list spans and folds it into
     * `archiveByEventId`. Called after every load, every "load more" and every
     * refresh tick - one request for the whole page, on the same tick as the
     * events read rather than on an interval of its own.
     *
     * A failure changes nothing: the map keeps what it has, no error card is
     * raised and no snackbar is dispatched. That is what lets this ship before
     * the backend does - every route answers 404, the markers never appear, and
     * the events page behaves exactly as it does without an archive.
     *
     * Deliberately not awaited by its callers: a slow or hanging archive must
     * not hold up the events list it was read alongside.
     *
     * The map is rebuilt from the index on every read rather than added to, so
     * an entry the archive dropped to make room for newer ones (openspec change
     * `recording-ring-buffer` - a full archive displaces its oldest entries
     * instead of refusing a save) simply stops being listed, and its event is
     * offered for saving again, exactly as after a release.
     */
    async loadArchive () {
      if (!this.cameras.length) {
        return
      }
      const ids = this.filteredCameraIds()
      let items
      try {
        items = await archiveService.getItems(ids, this.archiveWindow())
      } catch (err) {
        return // the archive is not served, or not reachable; see above
      }
      const map = {}
      items.forEach(item => {
        if (item.sourceEventId) {
          map[item.sourceEventId] = item
        }
      })
      // An entry this view inserted itself survives an index read that was
      // already in flight when the save went out - otherwise the marker a user
      // just earned would blink off until the following tick.
      Object.keys(this.archiveByEventId).forEach(eventId => {
        if (this.archiveByEventId[eventId].local && !map[eventId]) {
          map[eventId] = this.archiveByEventId[eventId]
        }
      })
      this.archiveByEventId = map
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
        // after the list is set, so the window is the one the list now spans -
        // a page of older events brought in by "load more" widens it
        this.loadArchive()
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
      // One index read per tick, on the events tick rather than an interval of
      // its own, and before the early return below so a quiet tick still
      // refreshes the markers. Not awaited: the merge and its scroll
      // compensation must not wait on the archive, and the marker it may add is
      // drawn over the thumbnail rather than in the tile's flow, so it moves
      // nothing the anchor is measured against.
      this.loadArchive()

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
    },

    /**
     * Saves the open event to the archive. The server answers only with the id
     * of the copy, so the marker is put up from here and the next index read
     * replaces it with the server's own item - `local` marks it as ours until
     * then. The release control waits for that item: what releasing means is
     * read from `originExpiresAt`, which this stub cannot state.
     * The dialog stays open on the same event throughout, and neither the list
     * nor its order is touched.
     */
    async saveToArchive () {
      const event = this.selectedEvent
      // the guard, not just the button's loading state: a second tap must not
      // reach the server even if it arrives before the disabled state renders
      if (!event || this.archiveSaving || this.archiveOf(event)) {
        return
      }
      this.archiveSaving = true
      try {
        const archiveId = await archiveService.archiveEvent(event.camera, event.id)
        this.$set(this.archiveByEventId, event.id, {
          archiveId,
          sourceEventId: event.id,
          cameraId: event.camera,
          state: 'pending',
          failureReason: null,
          originExpiresAt: null,
          thumbnailUrl: '',
          snapshotUrl: '',
          clipUrl: '',
          local: true
        })
        this.notify('success', 'archiveSavedMessage')
      } catch (err) {
        this.notify('error', 'archiveSaveFailedMessage', err && err.serverMessage)
      }
      this.archiveSaving = false
    },

    /**
     * Asks before releasing, in the terms the release actually carries: the
     * pending action is kept in `pendingAction`, which is what the one
     * ConfirmDialog's confirm label is computed off. The kind is always
     * `unsave` - the control is offered nowhere else - and the confirmation
     * names the date the original is held until, so a user near the boundary
     * sees the fact and not only our reading of it.
     */
    requestRelease () {
      const item = this.selectedArchive
      if (!item || this.archiveReleasing) {
        return
      }
      this.pendingAction = { kind: 'unsave', item, event: this.selectedEvent }
      this.$refs.confirmDialog.open(this.releaseMessage(item), () => this.releaseArchive(item))
    },

    releaseMessage (item) {
      return this.$t('page.kiosk.personenEvents.archiveReleaseUnsaveConfirm', {
        moment: dateUtils.dateToShortDateTime(new Date(item.originExpiresAt * 1000), this.$i18n.locale)
      })
    },

    /**
     * Removes the archive entry, and with it the marker. A refusal leaves the
     * event marked as saved and says so with the server's own sentence -
     * `loggingUtils` is inert, so a failing request reports nothing by itself.
     */
    async releaseArchive (item) {
      if (this.archiveReleasing) {
        return
      }
      this.archiveReleasing = true
      try {
        await archiveService.deleteItem(item.archiveId)
        if (item.sourceEventId) {
          this.$delete(this.archiveByEventId, item.sourceEventId)
        }
        this.notify('success', 'archiveReleasedMessage')
      } catch (err) {
        this.notify('error', 'archiveReleaseFailedMessage', err && err.serverMessage)
      }
      this.archiveReleasing = false
    },

    /**
     * Asks before deleting, with a sentence of its own: it names both places
     * the recording can live and says that this cannot be undone. Deliberately
     * not the release's sentence with a stronger adjective - the two actions
     * must not be readable as one.
     */
    requestDelete () {
      const event = this.selectedEvent
      if (!event || this.deleting) {
        return
      }
      this.pendingAction = { kind: 'delete-everywhere', item: this.archiveOf(event), event }
      this.$refs.confirmDialog.open(
        this.$t('page.kiosk.personenEvents.deleteConfirm'),
        () => this.deleteEverywhere(event))
    },

    /**
     * The deletion itself, which is `deleteRecording()` - the sequence is
     * shared with the archive view and lives in `utils/recordingDeletion.ts`.
     * What is left here is what only this page can decide: that the list
     * follows the *original*, and how the three outcomes are worded.
     */
    async deleteEverywhere (event) {
      // the guard, not just the button's loading state: a second tap must not
      // reach the server even if it arrives before the disabled state renders
      if (!event || this.deleting) {
        return
      }
      this.deleting = true
      const item = this.archiveOf(event)
      const { originGone, copyGone, hadCopy, reason } = await deleteRecording({
        cameraId: event.camera,
        eventId: event.id,
        archiveId: item ? item.archiveId : null
      })
      this.reportDeletion(event, originGone, copyGone, hadCopy, reason)
      this.deleting = false
    },

    /**
     * The three outcomes, and what each of them lets the view do.
     *
     * The optimistic removal follows the original: where it went, the entry
     * leaves the list and the dialog closes with it, even if the copy stayed -
     * what the list shows is what the source still has. Where only the copy
     * went, the event stays listed and merely loses its marking, which is
     * exactly what a release does. Where nothing went, nothing here moves.
     *
     * A half-finished deletion is its own message rather than a success or a
     * failure: reporting it as a success would leave a recording playable after
     * the GUI said it was gone, and it names what is still kept because that is
     * the part the user can still act on.
     */
    reportDeletion (event, originGone, copyGone, hadCopy, reason) {
      if (originGone && copyGone) {
        this.notify('success', 'deleteDoneMessage')
      } else if (originGone) {
        // only reachable with a copy that stayed behind: `copyGone` is true by
        // default where there was none
        this.notify('error', 'deletePartialCopyMessage', reason)
      } else if (copyGone && hadCopy) {
        this.notify('error', 'deletePartialOriginMessage', reason)
      } else {
        this.notify('error', 'deleteFailedMessage', reason)
      }
      if (copyGone) {
        this.$delete(this.archiveByEventId, event.id)
      }
      if (originGone) {
        this.events = this.events.filter(entry => entry.id !== event.id)
        if (this.highlightedId === event.id) {
          this.highlightedId = null
        }
        this.closeEvent()
      }
    },

    /**
     * The snackbar, dispatched from the view rather than through
     * `loggingUtils`: that path is switched off (`activated` is false and
     * nothing sets it), so a save whose outcome went only through it would tell
     * the user nothing at all. Reviving it globally is a decision of its own -
     * see design.md.
     * @param color 'success' or 'error', which also picks the heading
     * @param key the message key under page.kiosk.personenEvents
     * @param message the server's own sentence, when it sent one
     */
    notify (color, key, message) {
      this.$store.dispatch('gui/snackbar/snackbarEnqueue', {
        color,
        headingTKey: `message.${color}.heading`,
        descriptionTKey: `page.kiosk.personenEvents.${key}`,
        status: null,
        message: message || ''
      })
    },

    closeEvent () {
      this.detailDialog = false
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

.events-filter-camera,
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

.events-archive-state {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  opacity: 0.9;
}

.events-archive-state--failed {
  color: var(--v-error-base, #ff5252);
  opacity: 1;
}

.events-archive-origin {
  font-size: 12px;
  opacity: 0.8;
}

.events-back-btn {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 20;
}

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
