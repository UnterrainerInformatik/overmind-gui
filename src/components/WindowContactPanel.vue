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
          :class="'ma-0 mt-1 pa-0 darken-1 ' + getColorFor(contact)"
        >
          <v-tooltip
            v-if="bright(contact)"
            top
            :open-delay="openDelay"
            :disabled="!tooltips"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-icon class="ml-n2" v-bind="attrs" v-on="on"
                >brightness_high</v-icon
              ></template
            >
            <div v-html="$t('page.windowContacts.bright')"></div>
          </v-tooltip>
          <v-tooltip
            v-if="twilight(contact)"
            top
            :open-delay="openDelay"
            :disabled="!tooltips"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-icon class="ml-n2" v-bind="attrs" v-on="on"
                >brightness_medium</v-icon
              ></template
            >
            <div v-html="$t('page.windowContacts.twilight')"></div>
          </v-tooltip>
          <v-tooltip
            v-if="dark(contact)"
            top
            :open-delay="openDelay"
            :disabled="!tooltips"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-icon class="ml-n2" v-bind="attrs" v-on="on"
                >brightness_low</v-icon
              >
            </template>
            <div v-html="$t('page.windowContacts.dark')"></div>
          </v-tooltip>
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
                      contact.appliance.state.temperature
                  "
                  class="text-button"
                  >{{ contact.appliance.state.temperature }}°C</span
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
                      contact.appliance.state.batteryLevel
                  "
                  :level="contact.appliance.state.batteryLevel"
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
      <div v-html="$t('page.windowContacts.' + getOpenStateFor(contact))"></div>
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
    bright (contact) {
      return contact.appliance.state.luminosityLevel === 'bright'
    },
    twilight (contact) {
      return contact.appliance.state.luminosityLevel === 'twilight'
    },
    dark (contact) {
      return contact.appliance.state.luminosityLevel === 'dark'
    },
    opened (contact) {
      return contact.appliance.state.open && contact.appliance.state.tilt < 2
    },
    tilted (contact) {
      return contact.appliance.state.open && contact.appliance.state.tilt >= 2
    },
    closed (contact) {
      return !contact.appliance.state.open
    },
    getColorFor (contact) {
      if (this.opened(contact)) {
        return 'error'
      }
      if (this.tilted(contact)) {
        return 'warning'
      }
      if (this.closed(contact)) {
        return 'success'
      }
    },
    getOpenStateFor (contact) {
      if (this.opened(contact)) {
        return 'opened'
      }
      if (this.tilted(contact)) {
        return 'tilted'
      }
      if (this.closed(contact)) {
        return 'closed'
      }
    }
  }

}
</script>
