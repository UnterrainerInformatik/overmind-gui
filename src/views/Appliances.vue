<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0">
      <span v-for="(item, i) in appliances" :key="i">
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

export default {
  name: 'Appliances',

  components: {
    AppliancePanel
  },

  data: () => ({
    raw: {},
    appMap: new Map(),
    appliances: [],
    map: null,
    onlyActive: false,
    countAll: 0,
    loading: true
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    async getAppliances (showLoadingProgress) {
      this.loading = showLoadingProgress

      const appliances = []
      return appliancesService.getList().then((response) => {
        response.entries.forEach(element => {
          overmindUtils.parseState(element)
          overmindUtils.parseConfig(element)
          appliances.push(element)
        })
      }).then(() => {
        appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
        this.appliances = appliances
        this.appMap = new Map()
        for (const element of this.appliances) {
          this.appMap.set(element.id, element)
        }
        this.loading = false
      })
    }
  },

  mounted () {
    this.getAppliances(true)
    this.interval = setInterval(() => this.getAppliances(false), 3000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
