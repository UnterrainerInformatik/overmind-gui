<template>
  <v-card
    hover
    dense
    class="ma-2 mx-0 pa-0 flex-grow-1 flex-shrink-1 d-flex flex-column"
  >
    <v-toolbar dense class="secondary darken-1">
      <v-btn
        :class="
          'ma-0 pa-0 ml-n2 mr-3 warning' +
            ($vuetify.theme.dark ? ' lighten-3' : ' darken-3')
        "
        fab
        x-small
        @click="triggerEvent(item.sensorApplianceId, item.sensorPath, item.eventPath)"
        ><v-icon>play_arrow</v-icon></v-btn
      >
      <div
        class="ma-1 pa-0 text-caption text-md-subtitle-1 text-lg-subtitle-1 text-xl-subtitle-1"
      >
        {{ item.sensorApplianceName }}
      </div>
      <div
        class="ma-1 pa-0 text-caption text-md-subtitle-1 text-lg-subtitle-1 text-xl-subtitle-1"
      >
        {{ $t('sensors.' + item.sensorPath) }}
      </div>
      <div
        class="ma-1 pa-0 text-caption text-md-subtitle-1 text-lg-subtitle-1 text-xl-subtitle-1"
      >
        {{ $t('sensors.' + item.subType) }}
      </div>

    </v-toolbar>
  </v-card>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { post } from '@/utils/axiosUtils'

export default {
  name: 'SwitchPanel',

  props: {
    item: {}
  },

  data: () => ({
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    async triggerEvent (id, sensorPath, eventPath) {
      return post('uinf', 'triggerEvent', () => { return undefined }, () => {
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
