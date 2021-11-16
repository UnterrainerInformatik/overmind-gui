<template>
  <v-hover v-if="enabled !== null" v-slot="{ hover }">
    <v-card
      outlined
      :class="'ma-1 pa-0 ' + (enabled ? 'error ' : 'success ') + (hover ? '' : 'darken-1')"
      max-width="180px"
    >
      <v-card
        :class="'fill-height elevation-0 ma-0 noFocus' + ($vuetify.theme.dark ? (' grey darken-' + (hover ? '3' : '4')) : (' grey lighten-' + (hover ? '2' : '1')))"
        @click="
          triggerEvent(item.planId, item.sensorPath, item.eventPath)
        "
      >
        <v-card-title
          ><v-avatar class="" :color="(enabled ? 'error ' : 'success ') + ' darken-' + (hover ? '0' : '1')" size="42">
            <v-icon>power_settings_new</v-icon>
          </v-avatar>
        </v-card-title>
        <v-card-text :class="$vuetify.theme.dark ? 'grey--text' : 'black--text'">{{ item.description }}</v-card-text>
      </v-card>
    </v-card>
  </v-hover>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { singleton as plansService } from '@/utils/webservices/plansService'
import { singleton as eventsService } from '@/utils/webservices/eventsService'

export default {
  name: 'SwitchPanel',

  props: {
    item: {}
  },

  data: () => ({
    enabled: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    calculateEnabledState () {
      if (!this.item.enabledPlanForActivation) {
        this.enabled = false
      }
      return plansService.isPlanEnabled(this.item.enabledPlanForActivation).then((result) => {
        console.log(this.item.enabledPlanForActivation + ': ' + result)
        this.enabled = result
      })
    },
    async triggerEvent (id, sensorPath, eventPath) {
      console.log('triggerEvent')
      return eventsService.trigger(() => {
        return {
          applianceId: id,
          sensorPath: sensorPath,
          eventPath: eventPath
        }
      })
    }
  },

  mounted () {
    setInterval(() => this.calculateEnabledState(), 1000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
