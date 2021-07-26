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
import { getList } from '@/utils/axiosUtils'

export default {
  name: 'Switches',

  components: {
    SwitchPanel
  },

  data: () => ({
    raw: {},
    filtered: {},
    onlyActive: false,
    countAll: 0,
    loading: true
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    async getUsedSwitches (showLoadingProgress, additionalParams) {
      this.loading = showLoadingProgress
      console.log('getUsedSwitches')
      return getList('uinf', 'usedSwitches', 10000, 0, () => { return undefined }, () => { return undefined }, additionalParams).then((response) => {
        if (!response || !response.entries) {
          return
        }
        this.raw = response

        this.filtered = []
        response.entries.forEach(element => {
          if (element.sensorApplianceName.indexOf('TEST') > 0) {
            return
          }

          if (element.eventPath.endsWith('.click')) {
            const e = {
              subType: element.eventPath.startsWith('on.') ? 'on' : 'off'
            }
            Object.assign(e, element)
            this.filtered.push(e)
          }
        })

        this.loading = false
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
