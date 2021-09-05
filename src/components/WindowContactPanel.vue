<template>
  <v-card
    dense
    class="ma-2 mx-0 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
  >
    <v-toolbar
      dense
      :class="'ma-0 mt-1 pa-0 darken-1 ' + getColorFor(contact)"
      v-for="(contact, i) in item.contacts"
      :key="i"
    >
      <v-tooltip
        v-if="opened(contact)"
        top
        :open-delay="openDelay"
        :disabled="!tooltips"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-icon class="ml-n2" v-bind="attrs" v-on="on"
            >brightness_high</v-icon
          ></template
        >
        <div v-html="$t('page.windowContacts.opened')"></div>
      </v-tooltip>
      <v-tooltip
        v-if="tilted(contact)"
        top
        :open-delay="openDelay"
        :disabled="!tooltips"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-icon class="ml-n2" v-bind="attrs" v-on="on" v-if="tilted(contact)"
            >brightness_medium</v-icon
          ></template
        >
        <div v-html="$t('page.windowContacts.tilted')"></div>
      </v-tooltip>
      <v-tooltip
        v-if="closed(contact)"
        top
        :open-delay="openDelay"
        :disabled="!tooltips"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-icon class="ml-n2" v-bind="attrs" v-on="on" v-if="closed(contact)"
            >brightness_low</v-icon
          >
        </template>
        <div v-html="$t('page.windowContacts.closed')"></div>
      </v-tooltip>
      <v-container fluid class="ma-0 pa-0">
        <v-row class="ma-0 pa-0 align-center">
          <v-col class="ma-0 pa-0">
            <span class="ml-2">{{ contact.description }}</span>
          </v-col>
          <v-col class="text-right">
            <v-row class="ma-0 pa-0 justify-end">
              <v-cell>
                <v-row class="ma-0 pa-0">
                  <v-col class="ma-0 pa-0 text-left">
                    <span class="text-subtitle-2"
                      >{{ $t('page.windowContacts.lastTimeOnline') }}:</span
                    >
                  </v-col>
                </v-row>
                <v-row class="ma-0 pa-0">
                  <v-col class="ma-0 pa-0">
                    <span class="text-body-2">
                      {{
                        dateUtils.isoToDatePadded(
                          contact.appliance.lastTimeOnline,
                          $i18n.locale
                        )
                      }}</span
                    >
                    <span class="text-body-2">
                      ({{
                        dateUtils.isoToTime(
                          contact.appliance.lastTimeOnline,
                          $i18n.locale
                        )
                      }})</span
                    >
                  </v-col>
                </v-row>
              </v-cell>
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
  name: 'WindowContactPanel',

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
    opened (contact) {
      return contact.appliance.state.open && contact.appliance.state.tilt <= 5
    },
    tilted (contact) {
      return contact.appliance.state.open && contact.appliance.state.tilt > 5
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
    }
  }

}
</script>
