<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0" :v-if="map != null">
      <span v-for="(item, i) in filtered" :key="i">
        <SwitchPanel :item="item" @reload="getUsedSwitches"></SwitchPanel>
      </span>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import SwitchPanel from '@/components/SwitchPanel.vue'
import jsUtils from '@/utils/jsUtils'
import { getList, getById } from '@/utils/axiosUtils'

export default {
  name: 'Switches',

  components: {
    SwitchPanel
  },

  data: () => ({
    raw: {},
    filtered: {},
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
    async getUsedSwitches (showLoadingProgress) {
      this.loading = showLoadingProgress
      const descriptions = []
      const allPromises = []
      return getList('uinf', 'guiSwitches', 10000, 0, () => { return undefined }, () => { return undefined }).then((response) => {
        if (response == null || response === undefined) {
          return Promise.resolve()
        }
        response.entries.forEach(element => {
          allPromises.push(getById('uinf', 'appliances', element.applianceId, () => { return undefined }, () => { return undefined }).then((resp) => {
            if (resp == null || resp === undefined) {
              return
            }
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
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>