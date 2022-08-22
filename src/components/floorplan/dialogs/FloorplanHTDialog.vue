<template>
  <div v-if="app && item">
    <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-3 pa-0" label="Hat externen Strom:" :value="getExternalPower(app)"></v-text-field>
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
    getExternalPower (app) {
      if (app && app.state && app.state.hasExternalPower) {
        return app.state.hasExternalPower ? 'Ja' : 'Nein'
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
@import '../../index.scss';

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
