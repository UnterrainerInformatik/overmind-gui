<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap align-start">
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>

      <v-container fluid class="migrations-list">
        <div class="text-h5 mb-2">{{ $t('page.kiosk.migrations.title') }}</div>

        <v-card v-if="fetchError" outlined color="error" class="pa-4">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.migrations.fetchError') }}
        </v-card>

        <v-card v-else-if="!loading && entries.length === 0" outlined class="pa-4">
          {{ $t('page.kiosk.migrations.empty') }}
        </v-card>

        <v-expansion-panels v-else multiple>
          <v-expansion-panel v-for="entry in entries" :key="entry.fieldAccessorKey" :disabled="!entry.errorNodes || entry.errorNodes.length === 0">
            <v-expansion-panel-header>
              <div>
                <div class="text-h6">{{ entry.fieldAccessorKey }} &rarr; {{ entry.targetValue }}</div>
                <div class="mt-1">
                  <v-chip small color="success" class="mr-1">
                    {{ $t('page.kiosk.migrations.done') }}: {{ entry.doneCount }}
                  </v-chip>
                  <v-chip small color="info" class="mr-1">
                    {{ $t('page.kiosk.migrations.pending') }}: {{ entry.pendingCount }}
                  </v-chip>
                  <v-chip small :color="entry.errorCount > 0 ? 'error' : 'disabled'">
                    {{ $t('page.kiosk.migrations.error') }}: {{ entry.errorCount }}
                  </v-chip>
                </div>
              </div>
            </v-expansion-panel-header>
            <v-expansion-panel-content v-if="entry.errorNodes && entry.errorNodes.length">
              <v-list dense>
                <v-list-item v-for="node in entry.errorNodes" :key="node.applianceId">
                  <v-list-item-icon>
                    <v-icon color="error">error</v-icon>
                  </v-list-item-icon>
                  <v-list-item-content>
                    <v-list-item-title>{{ node.name }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-container>
    </v-container>
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
    debouncer: new Debouncer()
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
  max-width: 900px;
}

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
