<template>
  <v-card
    dense
    class="ma-2 mx-0 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
  >
    <v-toolbar dense class="secondary darken-1">
      <v-menu right close-on-click>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            :class="'ma-0 pa-0 ml-n2 mr-3 warning' + themeClass()"
            v-bind="attrs"
            v-on="on"
            fab
            small
            ><v-icon>toggle_off</v-icon></v-btn
          >
        </template>
        <v-list
          :class="
            'accent' +
              ($vuetify.theme.dark ? ' lighten-1' : ' lighten-1')
          "
        >
          <v-list-item dense class="pr-0" v-for="(mode, i) in item.modes" :key="i">
            <v-list-item-content hover>
              {{ mode.description }}
            </v-list-item-content>
            <v-list-item-action>
              <v-btn
                :class="'ma-0 pa-0 ml-n2 mr-3 warning' + themeClass()"
                fab
                small
                @click="triggerEvent(item.id, mode.sensorPath, mode.eventPath)"
              >
                <v-icon>touch_app</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-menu>
      <div
        class="ma-1 pa-0 text-caption text-md-subtitle-1 text-lg-subtitle-1 text-xl-subtitle-1"
      >
        {{ item.name }}
      </div>
    </v-toolbar>
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
