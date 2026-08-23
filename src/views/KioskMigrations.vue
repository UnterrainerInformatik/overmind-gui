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

        <v-card v-for="entry in entries" :key="entry.fieldAccessorKey" outlined class="mb-4 pa-2">
          <div class="text-h6 mb-2">{{ entry.fieldAccessorKey }} &rarr; {{ entry.targetValue }}</div>

          <v-simple-table dense>
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
                  <div v-if="entry.pendingNodes && entry.pendingNodes.length" class="migrations-node-list">
                    <v-chip
                      v-for="node in entry.pendingNodes"
                      :key="node.applianceId"
                      outlined
                      class="migrations-chip clickable-node"
                      @click="openNodeDialog(entry, node)"
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
                  <div v-if="entry.doneNodes && entry.doneNodes.length" class="migrations-node-list">
                    <v-chip
                      v-for="node in entry.doneNodes"
                      :key="node.applianceId"
                      outlined
                      class="migrations-chip"
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
                  <div v-if="entry.errorNodes && entry.errorNodes.length" class="migrations-node-list">
                    <v-chip
                      v-for="node in entry.errorNodes"
                      :key="node.applianceId"
                      outlined
                      class="migrations-chip clickable-node"
                      @click="openNodeDialog(entry, node)"
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
        </v-card>
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
          <div v-if="selectedNode.node.attemptCount !== null && selectedNode.node.attemptCount !== undefined" class="mb-2">
            {{ $t('page.kiosk.migrations.attempts') }}: {{ selectedNode.node.attemptCount }}
          </div>
          <div v-if="selectedNode.node.errorMessages && selectedNode.node.errorMessages.length">
            <div v-for="(msg, i) in selectedNode.node.errorMessages" :key="i">{{ msg }}</div>
          </div>
          <div v-else>{{ $t('page.kiosk.migrations.noErrorMessages') }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeNodeDialog">{{ $t('page.kiosk.migrations.close') }}</v-btn>
          <v-btn text @click="retrySelectedNode">{{ $t('page.kiosk.migrations.retry') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import { singleton as migrationsService } from '@/utils/webservices/migrationsService'
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
    selectedNode: null
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    async getStatus (showLoadingProgress) {
      this.loading = showLoadingProgress
      try {
        const response = await migrationsService.getStatus()
        this.entries = response.entries || []
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
    openNodeDialog (entry, node) {
      this.selectedNode = { entry, node }
      this.nodeDialog = true
    },
    closeNodeDialog () {
      this.nodeDialog = false
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
  padding: 8px 8px 0 8px;
}

.migrations-col {
  width: 33.33%;
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

.migrations-node-list {
  /* fills the remaining height below the page title, card title and table
     head; the fixed back button only overlaps the first column, which keeps
     its own bottom padding for it */
  max-height: calc(100vh - 170px);
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

/* the back button is fixed over the bottom left corner: give the first
   column room to scroll its last entries clear of it */
.migrations-cell:first-child .migrations-node-list {
  padding-bottom: 90px;
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

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
