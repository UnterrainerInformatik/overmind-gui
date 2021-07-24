<template>
  <div class="home">
    <v-container fluid>
      <v-card
        hover
        dense
        class="secondary ma-2 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
        v-for="(item, i) in raw.entries"
        :key="i"
      >
        <v-container class="pa-0 ma-1 text-caption fill-height fluid">
          <v-row cols="12" align="center">
            <v-col cols="9" class="text-subtitle-1">
              {{ item.name }}
            </v-col>
            <v-col cols="2">
              {{ item.cronDefOn ? item.cronDefOn : '' }}
            </v-col>
            <v-col cols="1" class="ma-0 pa-2">
              <v-row class="ma-0 pa-0">
                <v-col class="ma-0 pa-0 text-subtitle-2" align="center" justify="center">Priorität</v-col>
              </v-row>
              <v-row class="ma-0 pa-0">
                <v-col class="ma-0 pa-0" align="center" justify="center">{{ item.priority }}</v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-container>
      </v-card>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { getList } from '@/utils/axiosUtils'

export default {
  name: 'Main',

  components: {
  },

  data: () => ({
    raw: {},
    countAll: 0,
    loading: true
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    async getPlans (showLoadingProgress, size, offset, additionalParams) {
      this.loading = showLoadingProgress
      console.log('getPlans')
      return getList('uinf', 'orderedPlans', size, offset, () => { return undefined }, () => { return undefined }, additionalParams).then((response) => {
        if (!response || !response.entries) {
          return
        }
        this.raw = response
        this.loading = false
      })
    }
  },

  mounted () {
    const aps = 'enabled=true'
    this.getPlans(true, 1000, 0, aps)
    this.interval = setInterval(() => this.getPlans(false, 1000, 0, aps), 1000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
