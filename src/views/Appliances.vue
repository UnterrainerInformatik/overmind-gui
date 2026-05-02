<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0">
      <span v-for="item in appliances" :key="item.id">
        <AppliancePanel
          :item="item"
        ></AppliancePanel>
      </span>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import AppliancePanel from '@/components/AppliancePanel.vue'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as overmindUtils, pathsForApplianceType, setPathValue } from '@/utils/overmindUtils'
import { SseClient } from '@/utils/sseClient'

export default {
  name: 'Appliances',

  components: {
    AppliancePanel
  },

  data: () => ({
    sub: null,
    unwatchSub: null,
    appliances: [],
    onlyActive: false,
    countAll: 0,
    loading: true,
    applianceIndex: new Map()
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    applySubValuesToAppliances () {
      if (!this.sub || !this.sub.values) {
        return
      }
      for (const key of Object.keys(this.sub.values)) {
        const v = this.sub.values[key]
        if (v === undefined) {
          continue
        }
        const sep = key.indexOf(':')
        if (sep < 0) {
          continue
        }
        const id = Number(key.slice(0, sep))
        const path = key.slice(sep + 1)
        const app = this.applianceIndex.get(id)
        if (!app) {
          continue
        }
        if (path === 'lastTimeOnline') {
          this.$set(app, 'lastTimeOnline', v)
          continue
        }
        if (!app.state) {
          this.$set(app, 'state', {})
        }
        setPathValue(app.state, path, v)
      }
    }
  },

  async mounted () {
    const response = await appliancesService.getList()
    const appliances = []
    response.entries.forEach(element => {
      overmindUtils.parseState(element)
      overmindUtils.parseConfig(element)
      appliances.push(element)
    })
    appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
    this.appliances = appliances
    this.applianceIndex = new Map(appliances.map(a => [a.id, a]))
    this.loading = false

    const perAppliance = this.appliances
      .map(a => ({ applianceId: a.id, paths: pathsForApplianceType(a.type, 'compact') }))
      .filter(e => e.paths.length > 0)
    if (perAppliance.length === 0) {
      return
    }
    this.sub = SseClient.getInstance().subscribe({
      minInterval: 3000,
      selection: { perAppliance }
    })
    this.unwatchSub = this.$watch(() => this.sub && this.sub.ts, () => this.applySubValuesToAppliances())
  },

  beforeDestroy () {
    if (this.unwatchSub) {
      this.unwatchSub()
      this.unwatchSub = null
    }
    if (this.sub) {
      this.sub.close()
      this.sub = null
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
