<template>
  <v-hover v-slot="{ hover }">
    <v-card
      outlined
      :class="'ma-1 pa-0 success ' + (hover ? '' : 'darken-1')"
      max-width="180"
    >
      <v-card
        class="ma-0 black noFocus"
        @click="
          triggerEvent(item.id, item.mode.sensorPath, item.mode.eventPath)
        "
      >
        <v-card-title class="">{{ item.name }}</v-card-title>
        <v-card-text>{{ item.mode.description }}</v-card-text>
      </v-card>
    </v-card>
  </v-hover>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { singleton as eventsService } from '@/utils/webservices/eventsService'

export default {
  name: 'SwitchPanel',

  props: {
    item: {},
    map: {}
  },

  data: () => ({
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    themeClass () {
      return (this.$vuetify.theme.dark ? ' ' : ' ')
    },
    async triggerEvent (id, sensorPath, eventPath) {
      console.log('triggerEvent')
      return eventsService.trigger(() => {
        return {
          applianceId: id,
          sensorPath: sensorPath,
          eventPath: eventPath
        }
      }).then(() => {
        this.$emit('reload', true)
      })
    }
  }

}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
