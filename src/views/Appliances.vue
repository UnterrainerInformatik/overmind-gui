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
import { singleton as overmindUtils } from '@/utils/overmindUtils'
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
    loading: true
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    onSseUpdate (updated) {
      for (const app of updated) {
        const idx = this.appliances.findIndex(a => a.id === app.id)
        if (idx >= 0) {
          this.$set(this.appliances, idx, app)
        } else {
          this.appliances.push(app)
        }
      }
      this.appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
      this.loading = false
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
    this.loading = false

    const ids = this.appliances.map(a => a.id)
    this.sseHandle = SseClient.getInstance().subscribe(ids, (updated) => this.onSseUpdate(updated), 3000)
  },

  beforeDestroy () {
    if (this.sseHandle) {
      SseClient.getInstance().unsubscribe(this.sseHandle)
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
