<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <span v-for="(item, i) in items" :key="i">
          <KioskSwitchPanel :item="item" @reload="getUsedSwitches"></KioskSwitchPanel>
      </span>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskSwitchPanel from '@/components/KioskSwitchPanel.vue'
import { singleton as jsUtils } from '@/utils/jsUtils'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as guiSwitchesService } from '@/utils/webservices/guiSwitchesService'

export default {
  name: 'kioskOverview',

  components: {
    KioskSwitchPanel
  },

  data: () => ({
    raw: {},
    filtered: {},
    items: [],
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
        }).then(() => {
          this.items = []
          for (const item of this.filtered) {
            for (const mode of item.modes) {
              const newItem = Object.assign({}, item)
              delete newItem.modes
              newItem.mode = mode
              this.items.push(newItem)
            }
          }
          this.loading = false
        })
      })
    },
    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  mounted () {
    this.kioskMode(true)
    this.getUsedSwitches(true)
    this.interval = setInterval(() => this.getUsedSwitches(false), 10000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
