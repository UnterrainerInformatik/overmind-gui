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
    sseHandle: null,
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
    onTransportUpdate (payload) {
      if (!payload || !payload.values) {
        return
      }
      for (const triple of payload.values) {
        const app = this.applianceIndex.get(triple.applianceId)
        if (!app) {
          continue
        }
        if (!app.state) {
          this.$set(app, 'state', {})
        }
        setPathValue(app.state, triple.path, triple.value)
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
    this.sseHandle = await SseClient.getInstance().registerTransport({
      minInterval: 3000,
      selection: { perAppliance }
    }, (payload) => this.onTransportUpdate(payload))
  },

  beforeDestroy () {
    if (this.sseHandle) {
      SseClient.getInstance().unregisterTransport(this.sseHandle)
      this.sseHandle = null
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
