<template>
  <v-card
    dense
    class="ma-2 mx-0 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
  >
    <v-tooltip
      left
      :open-delay="openDelay"
      :disabled="!tooltips"
      v-for="(contact, i) in item.contacts"
      :key="i"
    >
      <template v-slot:activator="{ on, attrs }">
        <v-toolbar
          dense
          v-bind="attrs"
          v-on="on"
          :class="
            'ma-0 mt-1 pa-0 darken-1 ' +
            overmindUtils.getOpenColorFor(contact.appliance)
          "
        >
          <v-icon class="ml-n2">{{
            overmindUtils.getOpenIconFor(contact.appliance)
          }}</v-icon>
          <v-icon
            v-if="
              contact.appliance &&
              contact.appliance.state &&
              contact.appliance.state.luminosities &&
              contact.appliance.state.luminosities[0] &&
              contact.appliance.state.luminosities[0].luminosityLevel
            "
            class="ml-n2"
            >{{ overmindUtils.getLuminosityIconFor(contact.appliance) }}</v-icon
          >
          <v-container fluid class="ma-0 pa-0">
            <v-row class="ma-0 pa-0 align-center">
              <v-col class="ma-0 pa-0">
                <span class="ml-2 text-caption">{{ contact.description }}</span>
              </v-col>
              <v-col cols="3" class="ma-0 pa-0">
                <span
                  v-if="
                    contact.appliance &&
                    contact.appliance.state &&
                    contact.appliance.state.temperatures &&
                    contact.appliance.state.temperatures[0] &&
                    contact.appliance.state.temperatures[0].temperature
                  "
                  class="text-button"
                  >{{
                    contact.appliance.state.temperatures[0].temperature
                  }}°C</span
                >
              </v-col>
              <v-col class="ma-0 pa-0 hidden-xs">
                <LastTimeOnlineDisplay
                  v-if="contact.appliance && contact.appliance.lastTimeOnline"
                  :value="contact.appliance.lastTimeOnline"
                ></LastTimeOnlineDisplay>
              </v-col>
              <v-col cols="3" sm="4" class="ma-0 pa-0 text-right">
                <BatteryIndicator
                  v-if="
                    contact.appliance &&
                    contact.appliance.state &&
                    contact.appliance.state.batteries &&
                    contact.appliance.state.batteries[0] &&
                    contact.appliance.state.batteries[0].batteryLevel
                  "
                  :level="
                    Math.round(
                      contact.appliance.state.batteries[0].batteryLevel * 100
                    )
                  "
                ></BatteryIndicator>
                <v-btn
                  fab
                  x-small
                  v-if="
                    contact.appliance &&
                    contact.appliance.config &&
                    contact.appliance.config.address
                  "
                  class="ma-0 pa-0 warning"
                  @click="
                    overmindUtils.openInNewTab(contact.appliance.config.address)
                  "
                >
                  <v-icon>open_in_new</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </v-toolbar>
      </template>
      <div
        v-html="
          $t(
            'page.windowContacts.' +
              overmindUtils.getOpenStateFor(contact.appliance)
          ) + ' - ' + $t(
            'page.windowContacts.' +
              overmindUtils.getLuminosityLevelFor(contact.appliance)
          )
        "
      ></div>
    </v-tooltip>
  </v-card>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { singleton as overmindUtils } from '@/utils/overmindUtils'
import { mapGetters } from 'vuex'
import BatteryIndicator from '@/components/BatteryIndicator.vue'
import LastTimeOnlineDisplay from '@/components/LastTimeOnlineDisplay.vue'

export default {
  name: 'WindowContactPanel',

  props: {
    item: {},
    map: {}
  },

  components: {
    BatteryIndicator,
    LastTimeOnlineDisplay
  },

  data: () => ({
    overmindUtils
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
  }

}
</script>
