<template>
  <div v-if="app && item">
    <v-row>
      <v-col class="ma-0 mr-1 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Bewegung:" :value="getMotion(app)"></v-text-field>
      </v-col>
      <v-col class="ma-0 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Zeitpunkt:" :value="getTimestamp(app)"></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col class="ma-0 mr-1 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Helligkeit:" :value="getLuminosity(app)"></v-text-field>
      </v-col>
      <v-col class="ma-0 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Vibration:" :value="getVibration(app)"></v-text-field>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="js">
import { singleton as dateUtils } from '@/utils/dateUtils'

export default {
  name: 'FloorplanMotionDialog',

  props: {
    item: {},
    app: {}
  },

  components: {
  },

  data: () => ({
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    getMotion (app) {
      if (app && app.state && app.state.motions && app.state.motions[0] !== undefined && app.state.motions[0].motion !== undefined) {
        return app.state.motions[0].motion ? 'Ja' : 'Nein'
      }
      return null
    },
    getTimestamp (app) {
      if (app && app.state && app.state.motions && app.state.motions[0] !== undefined && app.state.motions[0].timestamp !== undefined) {
        return dateUtils.dateToShortDateLongTime(new Date(app.state.motions[0].timestamp * 1000), this.$i18n.locale)
      }
      return null
    },
    getLuminosity (app) {
      if (app && app.state && app.state.luminosities && app.state.luminosities[0] !== undefined && app.state.luminosities[0].luminosity !== undefined) {
        return app.state.luminosities[0].luminosity
      }
      return null
    },
    getVibration (app) {
      if (app && app.state && app.state.vibrations && app.state.vibrations[0] !== undefined && app.state.vibrations[0].vibration !== undefined) {
        return app.state.vibrations[0].vibration ? 'Ja' : 'Nein'
      }
      return null
    }
  },

  mounted () {
    console.log('mounted')
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.middle {
  font-size: 15px;
  font-weight: normal;
  line-height: 20px;
}
.small {
  font-size: 10px;
  font-weight: normal;
  line-height: 10px;
}
.bold {
  font-weight: bold;
}
</style>
