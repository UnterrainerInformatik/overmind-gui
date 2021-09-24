<template>
  <v-card
    dense
    class="ma-2 mx-0 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
  >
    <v-expansion-panels accordion hover class="ma-0 pa-0">
      <v-expansion-panel class="ma-0 pa-0">
        <v-expansion-panel-header
          :class="
            'my-0 py-0 secondary ' +
              (this.$vuetify.theme.dark ? 'darken-1' : '')
          "
        >
          <v-tooltip top :open-delay="openDelay" :disabled="!tooltips">
            <template v-slot:activator="{ on, attrs }">
              <v-icon class="ml-n2" v-bind="attrs" v-on="on">{{
                overmindUtils.getIconFor(item)
              }}</v-icon></template
            >
            <div v-html="$t('page.appliances.' + item.type)"></div>
          </v-tooltip>
          <v-container fluid class="ma-0 pa-0">
            <v-row class="ma-0 pa-0 align-center">
              <v-col class="ma-0 pa-0">
                <span class="ml-2 text-caption">{{ item.name }}</span>
              </v-col>
              <v-col class="ma-0 pa-0">
                <span
                  v-if="item.state && item.state.temperature"
                  class="text-button"
                  >{{ item.state.temperature }}°C</span
                >
              </v-col>
              <v-col class="ma-0 pa-0 hidden-sm-and-down text-right">
                <LastTimeOnlineDisplay
                  v-if="item.lastTimeOnline"
                  :value="item.lastTimeOnline"
                ></LastTimeOnlineDisplay>
              </v-col>
              <v-col cols="2" class="ma-0 pa-0 text-right">
                <BatteryIndicator
                  v-if="item.state && item.state.batteryLevel"
                  :level="item.state.batteryLevel"
                ></BatteryIndicator>
              </v-col>
            </v-row>
          </v-container>
        </v-expansion-panel-header>
        <v-expansion-panel-content
          :class="'secondary' + (this.$vuetify.theme.dark ? '' : ' lighten-1')"
        >
          <v-expansion-panels accordion hover class="ma-0 pa-0 mt-2">
            <v-expansion-panel class="ma-0 pa-0">
              <v-expansion-panel-header
                :class="
                  'my-0 py-0 secondary ' +
                    (this.$vuetify.theme.dark ? 'darken-2' : 'darken-1')
                "
              >
                <span class="my-1">
                  <v-btn
                    fab
                    small
                    v-if="item.config && item.config.address"
                    class="mr-4 warning"
                    @click.stop="
                      overmindUtils.openInNewTab(item.config.address)
                    "
                  >
                    <v-icon>open_in_new</v-icon>
                  </v-btn>
                  <v-btn
                    fab
                    small
                    v-if="item.config && item.config.address"
                    :disabled="disabled"
                    :class="color"
                    @click.stop="initializeAppliance(item)"
                  >
                    <v-icon>update</v-icon>
                  </v-btn>
                </span>
              </v-expansion-panel-header>
              <v-expansion-panel-content
                :class="
                  'mt-1 secondary' +
                    (this.$vuetify.theme.dark ? 'lighten-1' : ' lighten-2')
                "
              >
                <v-row>
                  <v-col>
                    <v-form-base
                      v-if="item.config"
                      :model="item.config"
                      :col="{ xs: 12, sm: 6 }"
                      class="border-frame"
                    />
                  </v-col>
                  <v-col>
                    <v-form-base
                      v-if="item.state"
                      :model="item.state"
                      :col="{ xs: 12, sm: 6 }"
                      class="border-frame"
                    />
                  </v-col>
                </v-row>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { singleton as overmindUtils } from '@/utils/overmindUtils'
import { mapGetters } from 'vuex'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import BatteryIndicator from '@/components/BatteryIndicator.vue'
import LastTimeOnlineDisplay from '@/components/LastTimeOnlineDisplay.vue'
import VFormBase from 'vuetify-form-base'

export default {
  name: 'AppliancePanel',

  props: {
    item: {},
    map: {}
  },

  components: {
    BatteryIndicator,
    LastTimeOnlineDisplay,
    VFormBase
  },

  data: () => ({
    overmindUtils,
    disabled: false,
    color: 'warning'
  }),

  computed: {
    ...mapGetters('gui/tooltips', {
      tooltips: 'tooltips',
      openDelay: 'openDelay'
    })
  },

  watch: {
  },

  methods: {
    initializeAppliance (item) {
      this.disabled = true
      appliancesService.initialize(item.id).then(() => {
        this.blink(item, 'success')
        this.disabled = false
      }).catch(() => {
        this.blink(item, 'error')
        this.disabled = false
      })
    },
    blink (item, color) {
      this.color = color
      overmindUtils.setTimeoutChain([
        () => {
          this.color = 'warning'
        },
        () => {
          this.color = color
        },
        () => {
          this.color = 'warning'
        },
        () => {
          this.color = color
        },
        () => {
          this.color = 'warning'
        }
      ], 500)
    }
  }

}
</script>
