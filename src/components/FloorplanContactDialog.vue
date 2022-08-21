<template>
  <div v-if="app && item">
    <v-row>
      <v-col class="ma-0 mr-1 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Offen:" :value="getOpen(app)"></v-text-field>
      </v-col>
      <v-col class="ma-0 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Neigung:" :value="getTilt(app)"></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col class="ma-0 mr-1 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Helligkeit:" :value="getLuminosity(app)"></v-text-field>
      </v-col>
      <v-col class="ma-0 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Helligkeitslevel:" :value="getLuminosityLevel(app)"></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col class="ma-0 pa-0">
        <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Vibration:" :value="getVibration(app)"></v-text-field>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="js">

export default {
  name: 'FloorplanHTDialog',

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
    getOpen (app) {
      if (app && app.state && app.state.closures && app.state.closures[0] !== undefined && app.state.closures[0].open !== undefined) {
        return app.state.closures[0].open ? 'Ja' : 'Nein'
      }
      return null
    },
    getTilt (app) {
      if (app && app.state && app.state.closures && app.state.closures[0] !== undefined && app.state.closures[0].tilt !== undefined) {
        return app.state.closures[0].tilt
      }
      return null
    },
    getVibration (app) {
      if (app && app.state && app.state.vibrations && app.state.vibrations[0] !== undefined && app.state.vibrations[0].vibration !== undefined) {
        return app.state.vibrations[0].vibration ? 'Ja' : 'Nein'
      }
      return null
    },
    getLuminosity (app) {
      if (app && app.state && app.state.luminosities && app.state.luminosities[0] !== undefined && app.state.luminosities[0].luminosity !== undefined) {
        return app.state.luminosities[0].luminosity
      }
      return null
    },
    getLuminosityLevel (app) {
      if (app && app.state && app.state.luminosities && app.state.luminosities[0] !== undefined && app.state.luminosities[0].luminosityLevel !== undefined) {
        return app.state.luminosities[0].luminosityLevel
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
