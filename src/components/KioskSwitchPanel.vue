<template>
  <v-card
    class="ma-1 pa-0 darken-1 success"
    max-width="180"
    @click="triggerEvent(item.id, item.mode.sensorPath, item.mode.eventPath)"
  >
    <v-card-title class="">{{ item.name }}</v-card-title>
    <v-card-text>{{ item.mode.description }}</v-card-text>
  </v-card>
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
