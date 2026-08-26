<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap align-start">
      <v-container fluid class="migrations-list">
        <div class="text-h5 mb-2">{{ $t('page.kiosk.migrations.title') }}</div>

        <v-card v-if="fetchError" outlined color="error" class="pa-4">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.migrations.fetchError') }}
        </v-card>

        <v-card v-else-if="!loading && entries.length === 0" outlined class="pa-4">
          {{ $t('page.kiosk.migrations.empty') }}
        </v-card>

        <v-expansion-panels accordion v-model="expandedIndex" class="migrations-panels">
          <v-expansion-panel v-for="entry in entries" :key="entry.fieldAccessorKey">
            <v-expansion-panel-header class="migrations-panel-header">
              <div class="d-flex align-center flex-nowrap migrations-panel-header-row">
                <span class="text-h6 text-truncate">{{ entry.fieldAccessorKey }} &rarr; {{ entry.targetValue }}</span>
                <v-spacer></v-spacer>
                <span class="migrations-header-count" :title="$t('page.kiosk.migrations.pending')">
                  <v-icon color="info" small>schedule</v-icon>{{ entry.pendingCount }}
                </span>
                <span class="migrations-header-count" :title="$t('page.kiosk.migrations.done')">
                  <v-icon color="success" small>check_circle</v-icon>{{ entry.doneCount }}
                </span>
                <span class="migrations-header-count" :title="$t('page.kiosk.migrations.error')">
                  <v-icon color="error" small>error</v-icon>{{ entry.errorCount }}
                </span>
              </div>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
          <v-simple-table dense class="migrations-table">
            <thead>
              <tr>
                <th class="text-left migrations-col">
                  <span>{{ $t('page.kiosk.migrations.pending') }}</span>
                </th>
                <th class="text-left migrations-col">
                  <span>{{ $t('page.kiosk.migrations.done') }}</span>
                </th>
                <th class="text-left migrations-col">
                  <div class="d-flex align-center">
                    <span>{{ $t('page.kiosk.migrations.error') }}</span>
                    <v-btn icon x-small class="ml-2" :disabled="entry.errorCount === 0" @click="retryAllErrors(entry)">
                      <v-icon small>refresh</v-icon>
                    </v-btn>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="migrations-cell">
                  <div v-if="entry.pendingNodes && entry.pendingNodes.length" class="migrations-node-list" :style="nodeListStyle">
                    <v-chip
                      v-for="node in entry.pendingNodes"
                      :key="node.applianceId"
                      outlined
                      class="migrations-chip clickable-node"
                      @click="openNodeDialog(entry, node, 'pending')"
                    >
                      <div class="d-flex justify-space-between align-center migrations-chip-content">
                        <div class="d-flex align-center">
                          <v-icon color="info" small left>schedule</v-icon>
                          {{ node.name }}
                        </div>
                        <span v-if="node.attemptCount !== null && node.attemptCount !== undefined">{{ node.attemptCount }}</span>
                      </div>
                    </v-chip>
                  </div>
                  <div v-else class="text-center text-h5">{{ entry.pendingCount }}</div>
                </td>
                <td class="migrations-cell">
                  <div v-if="entry.doneNodes && entry.doneNodes.length" class="migrations-node-list" :style="nodeListStyle">
                    <v-chip
                      v-for="node in entry.doneNodes"
                      :key="node.applianceId"
                      outlined
                      class="migrations-chip clickable-node"
                      @click="openNodeDialog(entry, node, 'done')"
                    >
                      <div class="d-flex justify-space-between align-center migrations-chip-content">
                        <div class="d-flex align-center">
                          <v-icon color="success" small left>check_circle</v-icon>
                          {{ node.name }}
                        </div>
                        <span v-if="node.attemptCount !== null && node.attemptCount !== undefined">{{ node.attemptCount }}</span>
                      </div>
                    </v-chip>
                  </div>
                  <div v-else class="text-center text-h5">{{ entry.doneCount }}</div>
                </td>
                <td class="migrations-cell">
                  <div v-if="entry.errorNodes && entry.errorNodes.length" class="migrations-node-list" :style="nodeListStyle">
                    <v-chip
                      v-for="node in entry.errorNodes"
                      :key="node.applianceId"
                      outlined
                      class="migrations-chip clickable-node"
                      @click="openNodeDialog(entry, node, 'error')"
                    >
                      <div class="d-flex justify-space-between align-center migrations-chip-content">
                        <div class="d-flex align-center">
                          <v-icon color="error" small left>error</v-icon>
                          {{ node.name }}
                        </div>
                        <span v-if="node.attemptCount !== null && node.attemptCount !== undefined">{{ node.attemptCount }}</span>
                      </div>
                    </v-chip>
                  </div>
                  <div v-else class="text-center text-h5">{{ entry.errorCount }}</div>
                </td>
              </tr>
            </tbody>
          </v-simple-table>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-container>
    </v-container>

    <KioskLinkPanel
      class="migrations-back-btn"
      :text="$t('page.kiosk.linkBack')"
      route="/app/kioskoverview"
    ></KioskLinkPanel>

    <v-dialog v-model="nodeDialog" max-width="500">
      <v-card v-if="selectedNode" outlined>
        <v-card-title>{{ selectedNode.node.name }}</v-card-title>
        <v-card-text>
          <div class="migrations-appliance-info mb-2">
            <div v-if="applianceLoading" class="d-flex align-center">
              <v-progress-circular indeterminate size="16" width="2" class="mr-2"></v-progress-circular>
              {{ $t('page.kiosk.migrations.applianceLoading') }}
            </div>
            <!-- the theme's error colour (#7d3939) is a background colour here,
                 not a text colour: as body text on the dark kiosk it is barely
                 readable, so the icon carries the signal and the text stays
                 legible - same split as the fetchError card above -->
            <div v-else-if="applianceError" class="d-flex align-center">
              <v-icon color="error" small class="mr-2">warning</v-icon>
              {{ $t('page.kiosk.migrations.applianceLoadError') }}
            </div>
            <template v-else-if="selectedAppliance">
              <div v-if="selectedAppliance.id !== null" class="migrations-appliance-field">
                {{ $t('page.kiosk.migrations.applianceId') }}: {{ selectedAppliance.id }}
              </div>
              <div v-if="selectedAppliance.ip !== null" class="migrations-appliance-field">
                {{ $t('page.kiosk.migrations.applianceIp') }}: {{ selectedAppliance.ip }}
              </div>
              <div v-if="selectedAppliance.mac !== null" class="migrations-appliance-field">
                {{ $t('page.kiosk.migrations.applianceMac') }}: {{ selectedAppliance.mac }}
              </div>
              <div v-if="selectedAppliance.lastTimeOnline !== null" class="migrations-appliance-field">
                {{ $t('page.kiosk.migrations.applianceLastTimeOnline') }}:
                {{ dateUtils.isoToShortDateTime(selectedAppliance.lastTimeOnline, $i18n.locale) }}
              </div>
              <div v-if="selectedAppliance.online !== null" class="migrations-appliance-field">
                {{ $t('page.kiosk.migrations.applianceOnline') }}:
                {{ selectedAppliance.online ? $t('page.kiosk.migrations.yes') : $t('page.kiosk.migrations.no') }}
              </div>
              <!-- no time of its own: the last-time-online line above is the
                   time through which this level is valid, and printing that
                   same value twice in six lines helps nobody
                   (see design.md, Decision 1) -->
              <div
                v-if="selectedAppliance.batteryDriven && selectedAppliance.batteryPercent !== null"
                class="migrations-appliance-field"
              >
                {{ $t('page.kiosk.migrations.applianceBattery') }}:
                <span :class="batteryTextClass(selectedAppliance.batteryPercent)">{{ selectedAppliance.batteryPercent }}%</span>
              </div>
            </template>
            <!-- the node's own facts, outside the branches above: they come
                 from the migrations poll, so they still render when the
                 appliance fetch is loading or has failed -->
            <div v-if="migrationTime !== null" class="migrations-node-fact">
              {{ $t('page.kiosk.migrations.migratedAt') }}:
              {{ dateUtils.isoToShortDateTime(migrationTime, $i18n.locale) }}
            </div>
            <div v-if="attemptCount !== null" class="migrations-node-fact">
              {{ $t('page.kiosk.migrations.attempts') }}: {{ attemptCount }}
            </div>
          </div>
          <!-- facts above the rule, failures below it - and no rule at all for
               a done node, which has nothing to put under it -->
          <template v-if="selectedNode.column !== 'done'">
            <v-divider class="mb-2"></v-divider>
            <div v-if="errorEntries.length">
              <div v-for="(entry, i) in errorEntries" :key="i">{{ errorMessageLine(entry, $i18n.locale) }}</div>
            </div>
            <div v-else>{{ $t('page.kiosk.migrations.noErrorMessages') }}</div>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeNodeDialog">{{ $t('page.kiosk.migrations.close') }}</v-btn>
          <v-btn v-if="selectedNode.column !== 'done'" text @click="retrySelectedNode">{{ $t('page.kiosk.migrations.retry') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import { singleton as migrationsService } from '@/utils/webservices/migrationsService'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as dateUtils } from '@/utils/dateUtils'
import { singleton as overmindUtils } from '@/utils/overmindUtils'
import { Debouncer } from '@/utils/debouncer'

export default {
  name: 'kioskMigrations',

  components: {
    KioskLinkPanel
  },

  data: () => ({
    interval: null,
    entries: [],
    loading: true,
    fetchError: false,
    debouncer: new Debouncer(),
    nodeDialog: false,
    selectedNode: null,
    selectedAppliance: null,
    applianceLoading: false,
    applianceError: false,
    // id of the appliance whose fetch is allowed to write the dialog state;
    // see loadAppliance() for the stale-response guard it backs
    requestedApplianceId: null,
    dateUtils,
    expandedKey: null,
    userCollapsed: false
  }),

  watch: {
  },

  computed: {
    // The poll replaces `entries` wholesale every 5s, so the panels' v-model
    // is tracked by fieldAccessorKey and mapped to an index here; an
    // index-based model would jump to another migration when entries reorder.
    expandedIndex: {
      get () {
        const idx = this.entries.findIndex(e => e.fieldAccessorKey === this.expandedKey)
        return idx === -1 ? undefined : idx
      },
      set (idx) {
        if (idx === undefined || idx === null) {
          this.expandedKey = null
          this.userCollapsed = true
        } else {
          this.expandedKey = this.entries[idx].fieldAccessorKey
          this.userCollapsed = false
        }
      }
    },
    // Height budget for the expanded panel's node lists: the viewport minus
    // the page title block, one 48px header per entry, the table head and the
    // strip the fixed back button covers (see .migrations-list padding).
    // Computed from entries.length instead of guessed in pure CSS so the
    // collapsed headers are accounted for; calibrated on 1024x600. The floor
    // keeps the list readable if enough migrations run at once to eat the
    // whole budget - the page scrolls then, which beats an unreadable list.
    nodeListStyle () {
      return { maxHeight: `max(120px, calc(100vh - ${204 + this.entries.length * 48}px))` }
    },
    // The time a done node was migrated. It does not exist in today's
    // backend - it arrives with the companion change
    // `reconciliation-node-times`, whose field name is not settled yet, so
    // the candidates live here in one place and the line simply stays away
    // until one of them shows up (see design.md, Risks).
    migrationTime () {
      if (!this.selectedNode || this.selectedNode.column !== 'done') {
        return null
      }
      const node = this.selectedNode.node
      return this.firstNonEmpty(node.doneAt, node.reconciledAt, node.migratedAt)
    },
    // How many attempts the cycle consumed - a fact about the node in every
    // column, the done one included: the backend counts the attempt that
    // succeeded, so a first-try convergence reports 1 and a node that fought
    // through four failures reports 5 (see design.md, Decision 4). A node the
    // backend reports no count for - never attempted, or converged before
    // counts were recorded - yields null and the line is left out.
    attemptCount () {
      if (!this.selectedNode) {
        return null
      }
      return this.firstDefined(this.selectedNode.node.attemptCount)
    },
    errorEntries () {
      if (!this.selectedNode) {
        return []
      }
      const node = this.selectedNode.node
      const messages = Array.isArray(node.errorMessages) ? node.errorMessages : []
      // the backend that collapses repeated reasons keeps their counts in a
      // list parallel to the reasons rather than inside each entry - and it
      // keeps the reasons' times the same way, in two more parallel lists
      // (see design.md, Decision 1)
      const counts = Array.isArray(node.occurrenceCounts) ? node.occurrenceCounts : []
      const firstAts = Array.isArray(node.firstOccurredAts) ? node.firstOccurredAts : []
      const lastAts = Array.isArray(node.lastOccurredAts) ? node.lastOccurredAts : []
      return messages
        .map((entry, i) => this.normalizeErrorMessage(entry, counts[i], lastAts[i], firstAts[i]))
        .filter(entry => entry !== null)
    }
  },

  methods: {
    syncExpansion () {
      const keys = this.entries.map(e => e.fieldAccessorKey)
      if (this.expandedKey !== null && !keys.includes(this.expandedKey)) {
        // the tracked migration finished/disappeared: fall back to collapsed
        this.expandedKey = null
        this.userCollapsed = false
      }
      if (this.expandedKey === null && !this.userCollapsed && keys.length === 1) {
        this.expandedKey = keys[0]
      }
    },
    async getStatus (showLoadingProgress) {
      this.loading = showLoadingProgress
      try {
        const response = await migrationsService.getStatus()
        this.entries = response.entries || []
        this.syncExpansion()
        this.fetchError = false
      } catch (err) {
        this.fetchError = true
      }
      this.loading = false
    },
    async retryAllErrors (entry) {
      try {
        await migrationsService.retryAllErrors(entry.fieldAccessorKey)
      } catch (err) {
        // outcome shows up on the next status poll, nothing else to surface here
      }
    },
    // `column` is the kind of the chip that was tapped ('pending'/'done'/
    // 'error'). A done node carries no errors and nothing to retry, so the
    // dialog drops those sections - taken from the column rather than
    // inferred from absent fields (see design.md, Decision 4).
    openNodeDialog (entry, node, column) {
      this.selectedNode = { entry, node, column }
      this.nodeDialog = true
      this.loadAppliance(node.applianceId)
    },
    closeNodeDialog () {
      this.nodeDialog = false
    },
    // The migrations payload carries no appliance details beyond the id, so
    // the dialog fetches the record once per open - no caching, no eager
    // prefetch for nodes nobody looks at (see design.md, Decision 1).
    async loadAppliance (applianceId) {
      this.selectedAppliance = null
      this.applianceError = false
      this.requestedApplianceId = applianceId
      if (applianceId === null || applianceId === undefined) {
        this.applianceLoading = false
        return
      }
      this.applianceLoading = true
      try {
        const appliance = await appliancesService.getById(applianceId)
        // a close/reopen while the request was in flight must not paint
        // another node's data into the dialog that is on screen now
        if (this.requestedApplianceId !== applianceId) {
          return
        }
        this.selectedAppliance = this.normalizeAppliance(applianceId, appliance)
      } catch (err) {
        if (this.requestedApplianceId !== applianceId) {
          return
        }
        this.applianceError = true
      }
      this.applianceLoading = false
    },
    // `config` and `state` are plain String columns on the server's appliance
    // entity, so they arrive JSON-stringified on some responses and already
    // parsed on others (cf. KioskWatermeterPanel parsing `app.state`).
    parseJsonField (value) {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch (err) {
          return null
        }
      }
      return value && typeof value === 'object' ? value : null
    },
    // Every field is optional: whatever the backend does not provide is
    // returned as null and left out of the dialog instead of rendered empty.
    normalizeAppliance (applianceId, appliance) {
      const record = appliance || {}
      const config = this.parseJsonField(record.config) || {}
      const state = this.parseJsonField(record.state) || {}
      const id = this.nonEmpty(record.id)
      return {
        id: id !== null ? id : this.nonEmpty(applianceId),
        ip: this.stripScheme(this.nonEmpty(config.address)),
        mac: this.nonEmpty(config.mac),
        lastTimeOnline: this.nonEmpty(record.lastTimeOnline),
        online: typeof record.pingable === 'boolean' ? record.pingable : null,
        // whether a battery line belongs here at all is the backend's own
        // answer, not something inferred from a stray battery reading: a
        // mains-powered device that once reported one would otherwise sprout
        // a meaningless line (see design.md, Decision 2)
        batteryDriven: typeof record.batteryDriven === 'boolean' ? record.batteryDriven : null,
        batteryPercent: this.batteryPercentOf(state)
      }
    },
    // 0..1 in the stored state, whole percent in the GUI - same conversion
    // AppliancePanel and Floorplan already do. Null whenever the state holds
    // no usable reading, so the line is omitted rather than shown as 0%.
    batteryPercentOf (state) {
      const batteries = Array.isArray(state.batteries) ? state.batteries : []
      const level = batteries.length && batteries[0] ? batteries[0].batteryLevel : null
      if (typeof level !== 'number' || !isFinite(level)) {
        return null
      }
      return Math.round(level * 100)
    },
    // getBatteryColor answers with a Vuetify background pair ('green
    // darken-2'); as a text colour that same pair spells
    // 'green--text text--darken-2'.
    batteryTextClass (percent) {
      const [base, variant] = overmindUtils.getBatteryColor(percent).split(' ')
      return variant ? `${base}--text text--${variant}` : `${base}--text`
    },
    // A failure reason arrives as a plain string today, as a timestamped
    // object from the companion backend change, and as a collapsed entry with
    // an occurrence count from `fix-reconciler-gen2-and-transport-errors`.
    // One normalizer absorbs all three, so the view never has to know which
    // backend version it is talking to (see design.md, Decision 5).
    // `fallbackCount`, `fallbackLastAt` and `fallbackFirstAt` carry the values
    // for the shape the backend actually ships: plain reason strings with the
    // count and the two times in lists parallel to them, rather than inside
    // the entry. An unknown time arrives as a null element there - the arrays
    // stay index-parallel - and falls through to no time at all.
    normalizeErrorMessage (entry, fallbackCount, fallbackLastAt, fallbackFirstAt) {
      if (entry === null || entry === undefined) {
        return null
      }
      // the last occurrence is what says whether the node is still failing, so
      // it wins over the first wherever both are supplied
      const fallbackAt = this.firstNonEmpty(fallbackLastAt, fallbackFirstAt)
      if (typeof entry !== 'object') {
        const plain = this.nonEmpty(String(entry))
        return plain === null ? null : { text: plain, at: fallbackAt, count: this.occurrenceCount(fallbackCount) }
      }
      const text = this.firstNonEmpty(entry.text, entry.message, entry.reason)
      if (text === null) {
        return null
      }
      // a collapsed entry spans first-to-last occurrence; a time carried inside
      // the entry wins over the parallel lists, the two being the same value
      // whenever both shapes are present
      const at = this.firstNonEmpty(entry.at, entry.recordedAt, entry.lastOccurredAt, entry.firstOccurredAt, fallbackAt)
      const count = this.occurrenceCount(this.firstDefined(entry.count, entry.occurrenceCount, entry.occurrences, fallbackCount))
      return { text, at, count }
    },
    // One line per reason: its time (localized, with seconds - a retry burst
    // records several inside one minute), the reason, and how often it
    // repeated. Anything the backend did not supply is left out rather than
    // rendered as a placeholder.
    errorMessageLine (entry, locale) {
      const parts = []
      if (entry.at !== null) {
        parts.push(dateUtils.isoToShortDateLongTime(entry.at, locale) + ':')
      }
      parts.push(entry.text)
      if (entry.count !== null && entry.count > 1) {
        parts.push(`(${entry.count}\u00d7)`)
      }
      return parts.join(' ')
    },
    occurrenceCount (value) {
      const count = Number(value)
      return Number.isFinite(count) && count >= 1 ? Math.round(count) : null
    },
    firstDefined (...values) {
      const found = values.find(value => value !== null && value !== undefined)
      return found === undefined ? null : found
    },
    firstNonEmpty (...values) {
      const found = values.map(value => this.nonEmpty(value)).find(value => value !== null)
      return found === undefined ? null : found
    },
    nonEmpty (value) {
      if (value === null || value === undefined) {
        return null
      }
      const text = typeof value === 'string' ? value.trim() : value
      return text === '' ? null : text
    },
    // config.address is a base URL for most appliance types ('http://10.0.0.5');
    // the dialog shows the host, not a link.
    stripScheme (address) {
      if (address === null) {
        return null
      }
      return this.nonEmpty(String(address).replace(/^[a-z][a-z0-9+.-]*:\/\//i, ''))
    },
    async retrySelectedNode () {
      const { entry, node } = this.selectedNode
      this.nodeDialog = false
      try {
        await migrationsService.retryAppliance(entry.fieldAccessorKey, node.applianceId)
      } catch (err) {
        // outcome shows up on the next status poll, nothing else to surface here
      }
    }
  },

  mounted () {
    // Kiosk mode is already sticky by the time an operator reaches this page
    // via the gear button, so unlike the primary kiosk dashboards this view
    // does not call kioskMode(true) itself (see design.md, Decision 2).
    this.debouncer.debounce(async () => this.getStatus(true))
    this.interval = setInterval(() => this.debouncer.debounce(async () => this.getStatus(false)), 5000)
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

.migrations-list {
  max-width: none;
  /* the back button is fixed over the bottom left corner (82px tall, 8px up):
     keep the panel stack clear of it so the last collapsed header stays
     readable and tappable while another panel is expanded */
  padding: 8px 8px 100px 8px;
}

.migrations-col {
  width: 33.33%;
}

/* keep every header at the collapsed 48px height (Vuetify grows the active
   header to 64px) so the height budget stays one constant per entry */
.migrations-panels .v-expansion-panel-header {
  min-height: 48px;
  padding: 4px 16px;
}

.migrations-panels .v-expansion-panel--active > .v-expansion-panel-header {
  min-height: 48px;
}

/* the panel body gets no padding of its own so the table spans the full
   width and the three columns match the pre-panel card layout */
.migrations-panels .v-expansion-panel-content__wrap {
  padding: 0;
}

.migrations-panel-header-row {
  width: 100%;
  min-width: 0;
}

.migrations-header-count {
  display: inline-flex;
  align-items: center;
  margin-left: 16px;
  flex-shrink: 0;
}

.migrations-header-count .v-icon {
  margin-right: 4px;
}

.migrations-back-btn {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 20;
}

.clickable-node {
  cursor: pointer;
}

.migrations-cell {
  vertical-align: top !important;
}

/* an entry's three columns share a single table row, so Vuetify's row-hover
   background repaints the whole table whenever the pointer is anywhere over
   it; the chips carry the hover feedback instead */
.migrations-table > .v-data-table__wrapper > table > tbody > tr:hover {
  background: transparent !important;
}

.migrations-node-list {
  /* max-height comes from the nodeListStyle computed: it depends on how many
     collapsed panel headers sit above and below the expanded one */
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  /* keep the scrollbar inside its own column instead of letting an overlay
     bar float next to the table, and reserve its width so the chips do not
     jump when a column starts scrolling */
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.35) transparent;
}

.migrations-node-list::-webkit-scrollbar {
  width: 8px;
}

.migrations-node-list::-webkit-scrollbar-track {
  background: transparent;
}

.migrations-node-list::-webkit-scrollbar-thumb {
  /* light thumb: the kiosk runs the dark theme, a dark thumb was invisible */
  background-color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
}

.migrations-chip {
  width: 100%;
  margin-bottom: 4px;
  background-color: transparent !important;
}

.migrations-chip .v-chip__content {
  width: 100%;
}

.migrations-chip-content {
  width: 100%;
}

/* Hover feedback rides on the chip's ::before state overlay, the hook Vuetify
   itself uses: an outlined chip's background is pinned transparent by
   `.v-chip.v-chip--outlined.v-chip.v-chip { ... !important }`, so a plain
   background rule on the chip loses. currentColor makes the overlay white on
   the kiosk's dark theme.

   Vuetify lights that overlay for every chip alike
   (`.theme--dark.v-chip:hover::before { opacity: .08 }`), including on touch,
   where the tablet can leave :hover latched after a tap - which would read as
   "selected" once the dialog is closed. So the overlay is switched off for all
   node chips first, then turned back up for the clickable ones behind
   `hover: hover`, i.e. only for a real pointer. Every column's chips open the
   detail dialog, so all of them carry `clickable-node`. `.v-chip` is repeated
   in the second selector to out-specify the first regardless of the order the
   two end up in. */
.migrations-chip.v-chip:hover::before {
  opacity: 0;
}

@media (hover: hover) {
  .migrations-chip.clickable-node.v-chip:hover::before {
    opacity: 0.12;
  }
}

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
