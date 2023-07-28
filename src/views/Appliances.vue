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
import { Debouncer } from '@/utils/debouncer'

export default {
  name: 'Appliances',

  components: {
    AppliancePanel
  },

  data: () => ({
    interval: null,
    appliances: [],
    onlyActive: false,
    countAll: 0,
    loading: true,
    debouncer: new Debouncer()
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    async getAppliances (showLoadingProgress) {
      this.loading = showLoadingProgress
      const appliances = []
      const response = await appliancesService.getList()
      response.entries.forEach(element => {
        overmindUtils.parseState(element)
        overmindUtils.parseConfig(element)
        appliances.push(element)
      })
      appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
      this.appliances = appliances
      this.loading = false
    }
  },

  mounted () {
    this.debouncer.debounce(async () => this.getAppliances(true))
    this.interval = setInterval(() => this.debouncer.debounce(async () => this.getAppliances(false)), 3000)
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
</style>
