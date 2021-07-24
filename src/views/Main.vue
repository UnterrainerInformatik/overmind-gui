<template>
  <div class="home">
    <v-btn-toggle mandatory borderless dense rounded v-model="viewToggle">
      <v-btn
        class="ma-1"
        @click="
          () => {
            onlyEnabled = true
            this.getPlans(true, 1000, 0)
          }
        "
        >{{ $t('page.plans.viewToggle.active') }}</v-btn
      >
      <v-btn
        class="ma-1"
        @click="
          () => {
            onlyEnabled = false
            this.getPlans(true, 1000, 0)
          }
        "
        >{{ $t('page.plans.viewToggle.all') }}</v-btn
      >
    </v-btn-toggle>
    <v-container fluid class="ma-0 pa-0">
      <v-card
        hover
        dense
        class="ma-2 mx-0 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
        v-for="(item, i) in raw.entries"
        :key="i"
      >
        <v-toolbar dense :class="item.enabled ? 'success' : 'secondary darken-1'">
          <v-btn
            :class="
              'ma-0 pa-0 ml-n2 mr-3 success' +
                ($vuetify.theme.dark ? ' lighten-3' : ' darken-3')
            "
            fab
            x-small
            @click="togglePlan(item.id)"
            ><v-icon>power_settings_new</v-icon></v-btn
          >
          <div
            class="text-caption text-md-subtitle-1 text-lg-subtitle-1 text-xl-subtitle-1"
          >
            {{ item.name }}
          </div>
          <v-spacer></v-spacer>

          <div class="mr-5 hidden-xs-only">
            {{ item.cronDefOn ? item.cronDefOn : '' }}
          </div>

          <div class="pa-0 ma-0 text-caption">
            <v-row align="center">
              <v-col class="ma-0 pa-2">
                <v-row class="ma-0 pa-0">
                  <v-col
                    class="ma-0 pa-0 text-subtitle-2"
                    align="center"
                    justify="center"
                    >Priorität</v-col
                  >
                </v-row>
                <v-row class="ma-0 pa-0">
                  <v-col class="ma-0 pa-0" align="center" justify="center">{{
                    item.priority
                  }}</v-col>
                </v-row>
              </v-col>
            </v-row>
          </div>
        </v-toolbar>
      </v-card>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { getList, post } from '@/utils/axiosUtils'

export default {
  name: 'Main',

  components: {
  },

  data: () => ({
    raw: {},
    onlyActive: false,
    countAll: 0,
    viewToggle: 0,
    onlyEnabled: true,
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
      return getList('uinf', 'orderedPlans', size, offset, () => { return undefined }, () => { return undefined }, additionalParams + (this.onlyEnabled ? '&enabled=true' : '')).then((response) => {
        if (!response || !response.entries) {
          return
        }
        this.raw = response
        this.loading = false
      })
    },
    async togglePlan (id) {
      return post('uinf', 'execute', () => { return undefined }, () => {
        return {
          applianceId: 20,
          actorPath: 'actor',
          commands: [
            {
              name: 'toggle',
              params: [
                [id]
              ]
            }
          ]
        }
      }).then(() => {
        this.getPlans(true, 1000, 0)
      })
    }
  },

  mounted () {
    this.getPlans(true, 1000, 0)
    this.interval = setInterval(() => this.getPlans(false, 1000, 0), 1000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
