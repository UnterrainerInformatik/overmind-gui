<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0">
      <span v-for="(item, i) in filtered" :key="i">
        <SwitchPanel :item="item" @reload="getUsedSwitches"></SwitchPanel>
      </span>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import SwitchPanel from '@/components/SwitchPanel.vue'
import { singleton as jsUtils } from '@/utils/jsUtils'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as guiSwitchesService } from '@/utils/webservices/guiSwitchesService'

export default {
  name: 'Switches',

  components: {
    SwitchPanel
  },

  data: () => ({
    interval: null,
    raw: {},
    filtered: {},
    onlyActive: false,
    loading: true
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    async getUsedSwitches (showLoadingProgress) {
      this.loading = showLoadingProgress
      const descriptions = []
      const allPromises = []
      return guiSwitchesService.getList().then((response) => {
        response.entries.forEach(element => {
          allPromises.push(appliancesService.getById(element.applianceId).then((resp) => {
            element.applianceName = resp.name
            descriptions.push(element)
          }))
        })
      }).then(() => {
        Promise.allSettled(allPromises).then(() => {
          descriptions.sort((a, b) => (a.applianceName > b.applianceName) ? 1 : (a.order > b.order) ? 1 : -1)
          const appliances = []
          const grouped = jsUtils.groupBy(descriptions, 'applianceId')
          for (const [key, value] of Object.entries(grouped)) {
            if (value.length === 0) {
              continue
            }
            value.sort((a, b) => (a.description > b.description) ? 1 : -1)
            appliances.push({ id: key, name: value[0].applianceName, modes: value })
          }
          appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
          this.filtered = appliances
          this.loading = false
        })
      })
    }
  },

  mounted () {
    this.getUsedSwitches(true)
    this.interval = setInterval(() => this.getUsedSwitches(false), 10000)
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
