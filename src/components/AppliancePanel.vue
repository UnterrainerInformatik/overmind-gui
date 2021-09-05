<template>
  <v-card
    dense
    class="ma-2 mx-0 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
  >
    <v-toolbar dense class="ma-0 mt-1 pa-0 darken-1">
      <v-tooltip top :open-delay="openDelay" :disabled="!tooltips">
        <template v-slot:activator="{ on, attrs }">
          <v-icon class="ml-n2" v-bind="attrs" v-on="on"
            >{{ getIconFor(item) }}</v-icon
          ></template
        >
        <div v-html="$t('page.appliances.' + item.type)"></div>
      </v-tooltip>
      <v-container fluid class="ma-0 pa-0">
        <v-row class="ma-0 pa-0 align-center">
          <v-col class="ma-0 pa-0">
            <span class="ml-2 text-caption">{{ item.name }}</span>
          </v-col>
          <v-col class="text-right">
            <v-row v-if="item.lastTimeOnline" class="ma-0 pa-0 justify-end">
              <v-col>
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
                        dateUtils.isoToTime(item.lastTimeOnline, $i18n.locale)
                      }})</span
                    >
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-toolbar>
  </v-card>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import dateUtils from '@/utils/dateUtils'
import { mapGetters } from 'vuex'

export default {
  name: 'AppliancePanel',

  props: {
    item: {},
    map: {}
  },

  data: () => ({
    dateUtils
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
    }
  }

}
</script>
