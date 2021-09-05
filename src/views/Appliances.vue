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
import { getList } from '@/utils/axiosUtils'

export default {
  name: 'Appliances',

  components: {
    AppliancePanel
  },

  data: () => ({
    raw: {},
    appliances: {},
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
      return getList('uinf', 'appliances', 10000, 0, () => { return undefined }, () => { return undefined }).then((response) => {
        if (response == null || response === undefined) {
          return Promise.resolve()
        }
        response.entries.forEach(element => {
          if (element.state) {
            try {
              element.state = JSON.parse(element.state)
            } catch (Error) {
              delete element.state
            }
          }
          if (element.config) {
            try {
              element.config = JSON.parse(element.config)
            } catch (Error) {
              delete element.config
            }
          }
          appliances.push(element)
        })
      }).then(() => {
        appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
        this.appliances = appliances
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
