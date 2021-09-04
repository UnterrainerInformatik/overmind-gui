<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0">
      <span v-for="(item, i) in filtered" :key="i">
        <v-card>
          <v-card-title class="ma-1 pa-0 mb-n1">
            <span v-if="item.floor > 1 && $i18n.locale == 'de'"
              >{{ item.floor - 1 }}. {{ $t('page.windowContacts.floor') }}</span
            >
            <span v-if="item.floor == 1 && $i18n.locale == 'de'">{{
              $t('page.windowContacts.groundFloor')
            }}</span>
            <span v-if="item.floor != 0 && $i18n.locale != 'de'"
              >{{ item.floor }}. {{ $t('page.windowContacts.floor') }}</span
            >
            <span v-if="item.floor == 0">{{
              $t('page.windowContacts.basement')
            }}</span>
          </v-card-title>
          <WindowContactPanel
            :item="item"
            @reload="getUsedWindowContacts"
          ></WindowContactPanel>
        </v-card>
      </span>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import WindowContactPanel from '@/components/WindowContactPanel.vue'
import jsUtils from '@/utils/jsUtils'
import { getList, getById } from '@/utils/axiosUtils'

export default {
  name: 'WindowContacts',

  components: {
    WindowContactPanel
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
    async getUsedWindowContacts (showLoadingProgress) {
      this.loading = showLoadingProgress
      const descriptions = []
      const allPromises = []
      return getList('uinf', 'guiWindowContacts', 10000, 0, () => { return undefined }, () => { return undefined }).then((response) => {
        if (response == null || response === undefined) {
          return Promise.resolve()
        }
        response.entries.forEach(element => {
          allPromises.push(getById('uinf', 'appliances', element.applianceId, () => { return undefined }, () => { return undefined }).then((resp) => {
            if (resp == null || resp === undefined) {
              return
            }
            element.applianceName = resp.name
            element.applianceState = JSON.parse(resp.state)
            descriptions.push(element)
          }))
        })
      }).then(() => {
        Promise.allSettled(allPromises).then(() => {
          descriptions.sort((a, b) => (a.description > b.description) ? 1 : (a.order > b.order) ? 1 : -1)
          const appliances = []
          const grouped = jsUtils.groupBy(descriptions, 'floor')
          for (const [key, value] of Object.entries(grouped)) {
            if (value.length === 0) {
              continue
            }
            appliances.push({ id: key, name: value[0].applianceName, floor: value[0].floor, contacts: value })
          }
          appliances.sort((a, b) => (a.floor > b.floor) ? 1 : -1)
          this.filtered = appliances
          this.loading = false
        })
      })
    }
  },

  mounted () {
    this.getUsedWindowContacts(true)
    this.interval = setInterval(() => this.getUsedWindowContacts(false), 3000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
