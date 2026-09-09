<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap align-start">
      <v-container
        fluid
        class="archive-content"
        :class="{ 'events-content--with-timeline': showTimeline }"
      >
        <div class="text-h5 mb-2">{{ $t('page.kiosk.personenArchiv.title') }}</div>

        <div class="archive-filters d-flex flex-wrap align-center mb-4">
          <v-select
            v-if="cameras.length > 1"
            v-model="cameraFilter"
            :items="cameraItems"
            :label="$t('page.kiosk.personenArchiv.filterCamera')"
            dense
            outlined
            hide-details="auto"
            class="archive-filter-camera mr-4 mb-2"
          ></v-select>

          <v-select
            v-model="nameFilter"
            :items="people"
            item-text="name"
            item-value="name"
            :label="$t('page.kiosk.personenArchiv.filterName')"
            clearable
            dense
            outlined
            hide-details="auto"
            class="archive-filter-name mr-4 mb-2"
          ></v-select>

          <v-select
            v-model="kindFilter"
            :items="kindItems"
            :label="$t('page.kiosk.personenArchiv.filterKind')"
            dense
            outlined
            hide-details="auto"
            class="archive-filter-kind mr-4 mb-2"
          ></v-select>

          <div class="archive-filter-date d-flex align-center mr-4 mb-2">
            <span class="archive-date-label mr-2">{{ $t('page.kiosk.personenArchiv.filterFrom') }}</span>
            <input
              type="datetime-local"
              v-model="fromLocal"
              class="archive-date-input"
              :style="{ colorScheme: $vuetify.theme.dark ? 'dark' : 'light' }"
            />
            <v-btn icon x-small class="ml-1" @click="fromLocal = ''">
              <v-icon small>clear</v-icon>
            </v-btn>
          </div>

          <div class="archive-filter-date d-flex align-center mb-2">
            <span class="archive-date-label mr-2">{{ $t('page.kiosk.personenArchiv.filterTo') }}</span>
            <input
              type="datetime-local"
              v-model="toLocal"
              class="archive-date-input"
              :style="{ colorScheme: $vuetify.theme.dark ? 'dark' : 'light' }"
            />
            <v-btn icon x-small class="ml-1" @click="toLocal = ''">
              <v-icon small>clear</v-icon>
            </v-btn>
          </div>

          <div class="archive-filter-quick d-flex align-center flex-wrap mb-2">
            <span class="archive-date-label mr-2">{{ $t('page.kiosk.personenArchiv.quickRangeLabel') }}</span>
            <v-btn
              v-for="range in quickRanges"
              :key="range.hours"
              small
              outlined
              class="archive-quick-btn mr-1"
              @click="applyQuickRange(range)"
            >
              {{ quickRangeText(range) }}
            </v-btn>
          </div>
        </div>

        <v-card v-if="camerasError" outlined color="error" class="pa-4 mb-4">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.personenArchiv.registryError') }}
        </v-card>
        <v-card v-else-if="!camerasLoading && cameras.length === 0" outlined class="pa-4 mb-4">
          <div class="mb-2">{{ $t('page.kiosk.personenArchiv.noCamera') }}</div>
          <KioskLinkPanel
            :text="$t('page.kiosk.linkCameras')"
            route="/app/kioskcameras"
          ></KioskLinkPanel>
        </v-card>
        <!-- The archive is this page's whole subject, so an archive it cannot
             read is an error state and not, as on the events page, a marker
             that quietly stays away. An empty list and an unreadable archive
             are different statements and are made differently. -->
        <v-card v-else-if="fetchError" outlined color="error" class="pa-4 mb-4 archive-fetch-error">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.personenArchiv.fetchError') }}
        </v-card>
        <v-card v-else-if="!loading && entries.length === 0" outlined class="pa-4 mb-4 archive-empty">
          {{ $t('page.kiosk.personenArchiv.empty') }}
        </v-card>

        <v-row v-if="entries.length" dense>
          <v-col v-for="entry in entries" :key="entry.id" cols="6" sm="4" md="3" lg="2">
            <EventTile
              :entry="entry"
              :highlighted="entry.id === highlightedId"
              :camera-name="cameras.length > 1 ? cameraName(entry) : ''"
              :marker="stateMarker(entry)"
              @select="openEntry"
            ></EventTile>
          </v-col>
        </v-row>

        <v-card v-if="loadMoreError" outlined color="error" class="pa-4 mt-2 mb-4">
          {{ $t('page.kiosk.personenArchiv.loadMoreError') }}
        </v-card>

        <div v-if="hasMore" class="d-flex justify-center mt-2 mb-4">
          <v-btn text class="archive-load-more" :loading="loadingMore" @click="loadEntries(false)">
            {{ $t('page.kiosk.personenArchiv.loadMore') }}
          </v-btn>
        </div>
      </v-container>
    </v-container>

    <EventsTimeline
      v-if="showTimeline"
      :events="entries"
      :axis-start="axisStart()"
      :axis-end="axisEnd()"
      :highlighted-id="highlightedId"
      :label="$t('page.kiosk.personenArchiv.timelineLabel')"
      @activate="revealEntry"
    ></EventsTimeline>

    <KioskLinkPanel
      class="archive-back-btn"
      :text="$t('page.kiosk.linkBack')"
      route="/app/kioskpersonen"
    ></KioskLinkPanel>

    <EventMediaDialog
      v-model="detailDialog"
      :entry="selectedEntry"
      :media="selectedMedia"
      :subtitle="detailSubtitle"
      :note="detailNote"
      :note-tone="selectedItem ? selectedItem.state : ''"
    >
      <template #state>
        <div
          v-if="stateText"
          class="archive-entry-state"
          :class="{ 'archive-entry-state--failed': selectedItem.state === 'failed' }"
        >
          <v-icon small class="mr-1">{{ selectedItem.state === 'failed' ? 'error_outline' : 'hourglass_empty' }}</v-icon>
          <span class="archive-entry-state-text">{{ stateText }}</span>
        </div>
      </template>
      <template #actions>
        <!-- The permanent delete and nothing else: in this view the copy *is*
             the recording, so a control that read as "release" would promise a
             distinction the user cannot act on here - it would empty the row
             they are looking at under a word that says it would not. -->
        <v-btn
          text
          color="error"
          class="archive-delete"
          :loading="deleting"
          @click="requestDelete"
        >{{ $t('page.kiosk.personenArchiv.deleteAction') }}</v-btn>
      </template>
    </EventMediaDialog>

    <ConfirmDialog
      ref="confirmDialog"
      :confirmText="$t('page.kiosk.personenArchiv.deleteAction')"
      :cancelText="$t('page.kiosk.personenArchiv.cancel')"
    ></ConfirmDialog>
  </div>
</template>

<script type="js">
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import EventsTimeline from '@/components/EventsTimeline.vue'
import EventTile from '@/components/EventTile.vue'
import EventMediaDialog from '@/components/EventMediaDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { singleton as archiveService } from '@/utils/webservices/archiveService'
import { singleton as camerasService } from '@/utils/webservices/camerasService'
import { singleton as doubleTakeService } from '@/utils/webservices/doubleTakeService'
import { singleton as dateUtils } from '@/utils/dateUtils'
import { deleteRecording } from '@/utils/recordingDeletion'
import { Debouncer } from '@/utils/debouncer'

const PAGE_SIZE = 30

const HOUR = 60 * 60 * 1000

// The events page's ranges, and for the same reason: each one only writes into
// the "from" field, so the controls show what is active because they *are* what
// is active.
const QUICK_RANGES = [
  { hours: 2 },
  { hours: 12 },
  { hours: 24 },
  { hours: 24 * 7, days: 7 }
]

/**
 * What the page opens on: seven days, not the events page's two hours. The
 * events page is about what just happened, so two hours is where its subject
 * lives; this page is about what was kept, where two hours would almost always
 * be empty and the user's first act would be to widen it. Bounded on open
 * either way, which is what the requirement is actually for.
 */
const DEFAULT_RANGE = QUICK_RANGES[QUICK_RANGES.length - 1]

/** The value the kind filter carries while it narrows nothing. */
const ALL_KINDS = ''

/**
 * The kinds the contract names. The list is not a closed set: what an entry's
 * kind actually is comes off the entry, and a kind the archive gains later
 * shows up in the filter labelled with its own raw value rather than being
 * hidden - which is also why "all" sends no `kind` at all.
 */
const KNOWN_KINDS = ['event', 'snapshot', 'recording']

/** See KioskPersonenEvents.vue - the exact inverse of epochFromLocal(). */
const localFromDate = date =>
  `${date.getFullYear()}-${dateUtils.pad(date.getMonth() + 1)}-${dateUtils.pad(date.getDate())}` +
  `T${dateUtils.pad(date.getHours())}:${dateUtils.pad(date.getMinutes())}`

/** The viewport below which the timeline gives way to the grid - measured on
 *  the events page, whose grid this one repeats tile for tile. */
const TIMELINE_MIN_WIDTH = 420

// how far below the viewport top a tile reached from the timeline is parked
const REVEAL_MARGIN = 16

export default {
  name: 'kioskPersonenArchiv',

  components: {
    KioskLinkPanel,
    EventsTimeline,
    EventTile,
    EventMediaDialog,
    ConfirmDialog
  },

  data: () => ({
    // Started only while something in the list is still being prepared - see
    // syncPolling(). Nothing else in the archive changes by itself.
    interval: null,
    debouncer: new Debouncer(),

    // the cameras configured for the events page: the archive holds copies of
    // what those cameras recorded, so it is the same set
    cameras: [],
    camerasLoading: true,
    camerasError: false,

    // the listing shape EventTile and EventsTimeline read, with the archive
    // item kept beside it under `item` - see mapItem()
    entries: [],
    loading: true,
    loadingMore: false,
    fetchError: false,
    loadMoreError: false,
    hasMore: false,

    people: [],

    cameraFilter: null,
    nameFilter: null,
    kindFilter: ALL_KINDS,
    // seeded here rather than in mounted(), so mounted()'s single load stays
    // the only one - see KioskPersonenEvents.vue
    fromLocal: localFromDate(new Date(Date.now() - DEFAULT_RANGE.hours * HOUR)),
    toLocal: '',

    quickRanges: QUICK_RANGES,
    highlightedId: null,

    detailDialog: false,
    selectedEntry: null,
    deleting: false,

    dateUtils,
    // guards a stale response from an earlier filter change writing over a
    // later one - same pattern as the events page
    requestId: 0
  }),

  watch: {
    cameraFilter () {
      this.loadEntries(true)
    },
    nameFilter () {
      this.loadEntries(true)
    },
    kindFilter () {
      this.loadEntries(true)
    },
    fromLocal () {
      this.loadEntries(true)
    },
    toLocal () {
      this.loadEntries(true)
    }
  },

  computed: {
    cameraItems () {
      return [{ value: null, text: this.$t('page.kiosk.personenArchiv.allCameras') }]
        .concat(this.cameras.map(camera => ({ value: camera.id, text: camera.displayName })))
    },

    /**
     * The kinds worth offering: the ones the contract names plus any the loaded
     * list actually carries, so a kind this GUI has never heard of is still
     * selectable - labelled with its own value, which is more than hiding it
     * would say.
     */
    kindItems () {
      const seen = this.entries.map(entry => entry.item.kind).filter(kind => !!kind)
      const kinds = Array.from(new Set(KNOWN_KINDS.concat(seen)))
      return [{ value: ALL_KINDS, text: this.$t('page.kiosk.personenArchiv.kindAll') }]
        .concat(kinds.map(kind => ({ value: kind, text: this.kindLabel(kind) })))
    },

    /** The archive item of the entry whose dialog is open, or null. */
    selectedItem () {
      return (this.selectedEntry && this.selectedEntry.item) || null
    },

    /**
     * What the open entry plays: its own archived media, and nothing at all
     * while there is none. A `pending` copy has no media yet and a `failed` one
     * never will, so neither is handed a URL to fail on - the note under the
     * media is what those two say instead.
     */
    selectedMedia () {
      const item = this.selectedItem
      if (!item || item.state !== 'ready') {
        return { hasClip: false, clipUrl: '', snapshotUrl: '' }
      }
      return {
        hasClip: !!item.clipUrl,
        clipUrl: item.clipUrl,
        snapshotUrl: item.snapshotUrl
      }
    },

    detailSubtitle () {
      const entry = this.selectedEntry
      if (!entry) {
        return ''
      }
      const parts = [dateUtils.dateToShortDateTime(new Date(entry.startTime * 1000), this.$i18n.locale)]
      if (this.cameras.length > 1) {
        parts.push(this.cameraName(entry))
      }
      if (entry.zones.length) {
        parts.push(entry.zones.join(', '))
      }
      return parts.join(' — ')
    },

    /** Why this entry cannot be played, where it cannot. */
    detailNote () {
      const item = this.selectedItem
      if (!item) {
        return ''
      }
      if (item.state === 'pending') {
        return this.$t('page.kiosk.personenArchiv.statePendingNote')
      }
      if (item.state === 'failed') {
        return item.failureReason
          ? this.$t('page.kiosk.personenArchiv.stateFailedNote', { reason: item.failureReason })
          : this.$t('page.kiosk.personenArchiv.stateFailedPlainNote')
      }
      return ''
    },

    /**
     * The short form of the same thing, in the actions row. A `ready` entry
     * carries none: it is simply there, and saying so would put a badge on
     * every single row for no information.
     */
    stateText () {
      const item = this.selectedItem
      if (!item || item.state === 'ready') {
        return ''
      }
      return item.state === 'failed'
        ? this.$t('page.kiosk.personenArchiv.stateFailed')
        : this.$t('page.kiosk.personenArchiv.statePending')
    },

    showTimeline () {
      return this.$vuetify.breakpoint.width >= TIMELINE_MIN_WIDTH
    }
  },

  methods: {
    kindLabel (kind) {
      const key = `page.kiosk.personenArchiv.kinds.${kind}`
      return this.$te(key) ? this.$t(key) : kind
    },

    /**
     * The archive query for the current filters. `kind` is left out entirely
     * while "all" is selected, so a kind the archive gains later reaches the
     * list without this page being touched.
     */
    buildFilters () {
      return {
        after: this.epochFromLocal(this.fromLocal),
        before: this.epochFromLocal(this.toLocal),
        kind: this.kindFilter || null,
        subLabel: this.nameFilter || null
      }
    },

    /** Which cameras to ask about: the chosen one, or all configured ones. */
    filteredCameraIds () {
      return this.cameraFilter === null
        ? this.cameras.map(camera => camera.id)
        : [this.cameraFilter]
    },

    epochFromLocal (value) {
      if (!value) {
        return null
      }
      const ms = new Date(value).getTime()
      return Number.isFinite(ms) ? Math.floor(ms / 1000) : null
    },

    quickRangeText (range) {
      return range.days
        ? this.$t('page.kiosk.personenArchiv.quickRangeDays', { count: range.days })
        : this.$t('page.kiosk.personenArchiv.quickRangeHours', { count: range.hours })
    },

    /** See KioskPersonenEvents.vue: a range ending "now" is an open bound. */
    applyQuickRange (range) {
      if (this.toLocal) {
        this.toLocal = ''
      }
      this.fromLocal = localFromDate(new Date(Date.now() - range.hours * HOUR))
    },

    axisStart () {
      const from = this.epochFromLocal(this.fromLocal)
      if (from !== null) {
        return from
      }
      return this.entries.length ? this.entries[this.entries.length - 1].startTime : this.axisEnd() - 3600
    },

    axisEnd () {
      const to = this.epochFromLocal(this.toLocal)
      return to !== null ? to : Math.floor(Date.now() / 1000)
    },

    /** See KioskPersonenEvents.vue's revealEvent() - the same reveal, tile for tile. */
    async revealEntry (id) {
      this.highlightedId = id
      await this.$nextTick()
      const index = this.entries.findIndex(entry => entry.id === id)
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

    /**
     * The camera an entry was kept from. The registry entry this page already
     * holds is the first source; the item's own `cameraName` covers a camera
     * the registry no longer lists, which the archive can well outlive.
     */
    cameraName (entry) {
      const camera = this.cameras.find(candidate => candidate.id === entry.camera)
      return (camera && camera.displayName) || entry.item.cameraName || `#${entry.camera}`
    },

    /**
     * One archive item as the grid and the timeline read it. The item travels
     * along under `item` for what only it carries - its state, its failure, the
     * event it was made from and its media - because mapping it *here* rather
     * than in the service is what keeps the service answering what the wire
     * says and nothing else.
     */
    mapItem (item) {
      return {
        id: item.archiveId,
        startTime: item.startTime,
        subLabel: item.subLabel,
        zones: item.zones,
        camera: item.cameraId,
        thumbnailUrl: item.thumbnailUrl,
        item
      }
    },

    /**
     * Everything about an entry that would change what is on screen. Two reads
     * that agree on this leave the entry's object - and with it its DOM node
     * and any dialog open on it - exactly where it was.
     */
    signatureOf (item) {
      return [item.state, item.failureReason, item.thumbnailUrl, item.snapshotUrl, item.clipUrl,
        item.subLabel, item.startTime, item.zones.join(',')].join('|')
    },

    /** What an entry's state draws over its thumbnail, or null for `ready`. */
    stateMarker (entry) {
      const state = entry.item.state
      if (state === 'failed') {
        return {
          icon: 'error_outline',
          tone: 'failed',
          title: this.$t('page.kiosk.personenArchiv.stateFailed')
        }
      }
      if (state === 'pending') {
        return {
          icon: 'hourglass_empty',
          tone: 'pending',
          title: this.$t('page.kiosk.personenArchiv.statePending')
        }
      }
      return null
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

    async loadPeople () {
      try {
        this.people = await doubleTakeService.getPeople()
      } catch (err) {
        // the name filter simply stays empty; the archive itself still loads
      }
    },

    /**
     * One page of the archive under the current filters.
     * @param before the upper bound to ask below, or null for the filter's own
     * @param limit how many to ask for
     */
    async fetchPage (before, limit) {
      const filters = this.buildFilters()
      return archiveService.getItems(this.filteredCameraIds(), {
        ...filters,
        before: before === null ? filters.before : before,
        limit
      })
    },

    /**
     * The list, first page or next one.
     *
     * The next page re-asks the same query with `before` set one second past
     * the oldest listed entry: the index route has `limit` but no cursor, the
     * bound is assumed exclusive, and one second *past* rather than at it means
     * an inclusive bound re-reads one entry - free, and de-duplicated below -
     * where an exclusive-in-the-other-direction one would leave a hole.
     */
    async loadEntries (reset) {
      const requestId = ++this.requestId
      if (!this.cameras.length) {
        this.loading = false
        this.loadingMore = false
        return
      }
      if (reset) {
        this.loading = true
        this.fetchError = false
        this.highlightedId = null
      } else {
        this.loadingMore = true
        this.loadMoreError = false
      }
      const oldest = this.entries.length ? this.entries[this.entries.length - 1].startTime : null
      const before = reset || oldest === null ? null : oldest + 1
      let page
      try {
        page = await this.fetchPage(before, PAGE_SIZE)
      } catch (err) {
        if (requestId !== this.requestId) {
          return
        }
        if (reset) {
          this.fetchError = true
          this.entries = []
          this.hasMore = false
        } else {
          this.loadMoreError = true
        }
        this.loading = false
        this.loadingMore = false
        this.syncPolling()
        return
      }
      if (requestId !== this.requestId) {
        // a newer filter change or "load more" already took over
        return
      }
      if (reset) {
        this.entries = page.map(item => this.mapItem(item))
        this.hasMore = page.length >= PAGE_SIZE
      } else {
        const added = this.appendEntries(page)
        // A full page means there is probably more; a page that added nothing
        // new means the window stopped moving - which is what a run of entries
        // sharing one start time would otherwise do forever - and ends the
        // offer whatever the page's length said.
        this.hasMore = page.length >= PAGE_SIZE && added > 0
      }
      this.loading = false
      this.loadingMore = false
      this.syncPolling()
    },

    /**
     * Appends a page, skipping what is already listed. The one re-read entry
     * the `before` walk produces is dropped here, and so is a concurrent save
     * that landed in two pages at once.
     * @return how many entries were actually added
     */
    appendEntries (page) {
      const known = new Set(this.entries.map(entry => entry.id))
      const fresh = page.filter(item => !known.has(item.archiveId))
      this.entries = this.entries
        .concat(fresh.map(item => this.mapItem(item)))
        .sort((a, b) => b.startTime - a.startTime)
      return fresh.length
    },

    /**
     * One background tick while something is being prepared: the whole listed
     * range is re-read and folded in.
     *
     * It asks for as many entries as are listed rather than one page, so a
     * pending entry the user reached through "load more" is covered too; the
     * filters bound the query either way, so this is never an unbounded read.
     *
     * A failure changes nothing at all - no error card, no emptied list. The
     * entries already on screen keep standing and the next tick tries again,
     * which is what lets a kiosk recover by itself.
     */
    async refreshEntries () {
      if (!this.cameras.length) {
        return
      }
      const requestId = this.requestId
      let page
      try {
        page = await this.fetchPage(null, Math.max(PAGE_SIZE, this.entries.length))
      } catch (err) {
        return // the archive hiccuped; the list stays as it is
      }
      if (requestId !== this.requestId) {
        // a filter change or a "load more" already took over
        return
      }
      // The scroll anchor, measured the way the events page measures it: how
      // far one tile actually moved, not how much the document grew.
      const scroller = document.scrollingElement
      const anchor = scroller && scroller.scrollTop > 0 ? this.topmostVisibleTile() : null
      const anchorTop = anchor ? anchor.getBoundingClientRect().top : 0
      this.mergeEntries(page)
      this.syncPolling()
      if (anchor) {
        await this.$nextTick()
        scroller.scrollTop += anchor.getBoundingClientRect().top - anchorTop
      }
    },

    // The first tile whose top edge is at or below the viewport top - see
    // KioskPersonenEvents.vue.
    topmostVisibleTile () {
      const tiles = this.$el ? this.$el.querySelectorAll('.events-card') : []
      return Array.prototype.find.call(tiles, tile => tile.getBoundingClientRect().top >= 0) || null
    },

    /**
     * Folds a re-read into the list. An entry that says the same as before
     * keeps its existing object, so its DOM node survives, its thumbnail is not
     * re-fetched and a dialog open on it is not disturbed. An entry that
     * changed is replaced - and where that is the open one, the dialog follows
     * it onto the new object, which is what makes a copy that has just finished
     * being prepared playable without the user closing anything.
     *
     * An entry the answer did not carry is kept rather than dropped: this page
     * removes what it deletes itself, and a read that came back short must not
     * empty a list the user is looking at.
     */
    mergeEntries (page) {
      const existing = new Map(this.entries.map(entry => [entry.id, entry]))
      const merged = []
      page.forEach(item => {
        const known = existing.get(item.archiveId)
        existing.delete(item.archiveId)
        if (known && this.signatureOf(known.item) === this.signatureOf(item)) {
          merged.push(known)
          return
        }
        const entry = this.mapItem(item)
        merged.push(entry)
        if (this.selectedEntry && this.selectedEntry.id === entry.id) {
          this.selectedEntry = entry
        }
      })
      existing.forEach(entry => merged.push(entry))
      this.entries = merged.sort((a, b) => b.startTime - a.startTime)
    },

    /**
     * The 5s read exists for exactly one thing: a copy that is still being
     * prepared becoming playable. So it runs while the list holds one and not a
     * moment longer - polling a list that only the user changes would be a
     * request every five seconds for nothing.
     */
    syncPolling () {
      const pending = this.entries.some(entry => entry.item.state === 'pending')
      if (pending && !this.interval) {
        this.interval = setInterval(() => this.debouncer.debounce(async () => this.refreshEntries()), 5000)
      } else if (!pending && this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    },

    openEntry (entry) {
      this.selectedEntry = entry
      this.detailDialog = true
    },

    closeEntry () {
      this.detailDialog = false
    },

    /**
     * Asks before deleting, in the terms the deletion carries: it names both
     * places the recording can live and says that this cannot be undone. The
     * same sentence the events page asks with, because it is the same act.
     */
    requestDelete () {
      const entry = this.selectedEntry
      if (!entry || this.deleting) {
        return
      }
      this.$refs.confirmDialog.open(
        this.$t('page.kiosk.personenArchiv.deleteConfirm'),
        () => this.deleteEntry(entry))
    },

    /**
     * Deletes the recording everywhere it is kept - the shared sequence in
     * `utils/recordingDeletion.ts`.
     *
     * The source event is named whenever the entry carries one, even where
     * `originExpiresAt` says the original is long gone: a DELETE on an event
     * that no longer exists answers 404, which counts as gone, so it costs one
     * wasted round trip against the certainty of not leaving a recording
     * behind.
     */
    async deleteEntry (entry) {
      // the guard, not just the button's loading state: a second tap must not
      // reach the server even if it arrives before the disabled state renders
      if (!entry || this.deleting) {
        return
      }
      this.deleting = true
      const item = entry.item
      const { originGone, copyGone, hadCopy, reason } = await deleteRecording({
        cameraId: item.cameraId,
        eventId: item.sourceEventId,
        archiveId: item.archiveId
      })
      this.reportDeletion(entry, originGone, copyGone, hadCopy, reason)
      this.deleting = false
    },

    /**
     * The three outcomes from this page's side of the recording.
     *
     * Here the list follows the *copy*, not the original: the copy is what this
     * page shows, so the entry leaves when the copy went and stays when it did
     * not - the mirror image of the events page, which follows the original for
     * exactly the same reason. A half-finished deletion is its own message and
     * names what is still kept, because that is the part the user can still act
     * on.
     */
    reportDeletion (entry, originGone, copyGone, hadCopy, reason) {
      if (originGone && copyGone) {
        this.notify('success', 'deleteDoneMessage')
      } else if (copyGone) {
        this.notify('error', 'deletePartialOriginMessage', reason)
      } else if (originGone && hadCopy) {
        this.notify('error', 'deletePartialCopyMessage', reason)
      } else {
        this.notify('error', 'deleteFailedMessage', reason)
      }
      if (copyGone) {
        this.entries = this.entries.filter(candidate => candidate.id !== entry.id)
        if (this.highlightedId === entry.id) {
          this.highlightedId = null
        }
        this.closeEntry()
        this.syncPolling()
      }
    },

    /** See KioskPersonenEvents.vue: `loggingUtils` is inert, so the view
     *  dispatches the snackbar itself. */
    notify (color, key, message) {
      this.$store.dispatch('gui/snackbar/snackbarEnqueue', {
        color,
        headingTKey: `message.${color}.heading`,
        descriptionTKey: `page.kiosk.personenArchiv.${key}`,
        status: null,
        message: message || ''
      })
    }
  },

  mounted () {
    // Kiosk mode is already sticky by the time a user reaches this page via the
    // "Archiv" button on KioskPersonen, so this view does not call
    // kioskMode(true) itself - same as KioskPersonenEvents.vue.
    this.loadPeople()
    this.loadCameras().then(() => this.loadEntries(true))
  },

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.archive-content {
  max-width: none;
  /* the back button is fixed over the bottom left corner: keep the grid clear
     of it, the same padding convention .events-content uses */
  padding: 8px 8px 100px 8px;
}

.archive-filter-camera,
.archive-filter-name,
.archive-filter-kind {
  max-width: 220px;
}

.archive-date-label {
  font-size: 14px;
  opacity: 0.8;
}

.archive-date-input {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  color: inherit;
  padding: 4px 8px;
  font-size: 14px;
}

.archive-entry-state {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  opacity: 0.9;
}

.archive-entry-state--failed {
  color: var(--v-error-base, #ff5252);
  opacity: 1;
}

.archive-back-btn {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 20;
}

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
