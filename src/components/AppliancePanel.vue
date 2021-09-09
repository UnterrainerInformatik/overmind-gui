<template>
  <v-card
    dense
    class="ma-2 mx-0 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
  >
    <v-expansion-panels accordion hover class="ma-0 pa-0">
      <v-expansion-panel class="ma-0 pa-0">
        <v-expansion-panel-header :class="'my-0 py-0 secondary ' + (this.$vuetify.theme.dark ? 'darken-1' : '')">
          <v-tooltip top :open-delay="openDelay" :disabled="!tooltips">
            <template v-slot:activator="{ on, attrs }">
              <v-icon class="ml-n2" v-bind="attrs" v-on="on">{{
                getIconFor(item)
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
                <span v-if="item.state && item.state.temperature" class="text-button">{{ item.state.temperature }}°C</span>
              </v-col>
              <v-col class="ma-0 pa-0 mr-9 text-right">
                <v-row v-if="item.lastTimeOnline" class="ma-0 pa-0 justify-end">
                  <v-col class="ma-0 pa-0">
                    <v-row class="ma-0 pa-0 justify-end">
                      <v-col cols="8" md="4" lg="3" class="ma-0 pa-0 text-left">
                        <span class="text-caption font-weight-bold text-no-wrap"
                          >{{ $t('page.windowContacts.lastTimeOnline') }}:</span
                        >
                      </v-col>
                    </v-row>
                    <v-row class="ma-0 pa-0 justify-end">
                      <v-col
                        cols="8"
                        md="4"
                        lg="3"
                        class="ma-0 pa-0 text-left text-no-wrap"
                      >
                        <span class="text-caption">
                          {{
                            dateUtils.isoToDatePadded(
                              item.lastTimeOnline,
                              $i18n.locale
                            )
                          }}</span
                        >
                        <span class="text-caption">
                          ({{
                            dateUtils.isoToTime(
                              item.lastTimeOnline,
                              $i18n.locale
                            )
                          }})</span
                        >
                      </v-col>
                    </v-row>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-container>
        </v-expansion-panel-header>
        <v-expansion-panel-content :class="'secondary' + (this.$vuetify.theme.dark ? '' : ' lighten-1')">
          <v-row class="mt-1">
            <v-col>
              <v-btn v-if="item.config && item.config.address" class="warning" @click="openInNewTab(item.config.address)">
                <v-icon>open_in_new</v-icon>
              </v-btn>
            </v-col>
            <v-col>
              <v-btn v-if="item.config && item.config.address" :disabled="disabled" :class="color" @click="initializeAppliance(item)">
                <v-icon>flag</v-icon>
              </v-btn>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <span v-if="item.config"><pre>{{ `config: ${JSON.stringify(item.config, undefined, 2)}` }}</pre></span>
            </v-col>
            <v-col>
              <span v-if="item.state"><pre>{{ `state: ${JSON.stringify(item.state, undefined, 2)}` }}</pre></span>
            </v-col>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import dateUtils from '@/utils/dateUtils'
import { mapGetters } from 'vuex'
import { getList } from '@/utils/axiosUtils'

export default {
  name: 'AppliancePanel',

  props: {
    item: {},
    map: {}
  },

  data: () => ({
    dateUtils,
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
    getIconFor (item) {
      switch (item.type) {
        case 'SHUTTERS':
          return 'camera'
        case 'LIGHTS':
          return 'lightbulb'
        case 'DEBUGGER':
          return 'bug_report'
        case 'GROUP_PARALLEL':
          return 'groups'
        case 'PLAN_MANIPULATOR':
          return 'adb'
        case 'SWITCH':
          return 'toggle_on'
        case 'CONTACT_SENSOR':
          return 'meeting_room'
        case 'MOTION_SENSOR':
          return 'vibration'
        case 'PLUG':
          return 'power'
        default:
          return 'adb'
      }
    },
    openInNewTab (address) {
      window.open(address, '_blank')
    },
    blink (item, color) {
      this.color = color
      this.setTimeoutChain([
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
    },
    setTimeoutChain (functionArray, deltaMillis) {
      let dm = deltaMillis
      for (const func of functionArray) {
        setTimeout(func, dm)
        dm += deltaMillis
      }
    },
    initializeAppliance (item) {
      this.disabled = true
      getList('uinf', 'initialize', 1, 0, `id=${item.id}`).then(() => {
        this.blink(item, 'success')
        this.disabled = false
      }).catch(() => {
        this.blink(item, 'error')
        this.disabled = false
      })
    }
  }

}
</script>
