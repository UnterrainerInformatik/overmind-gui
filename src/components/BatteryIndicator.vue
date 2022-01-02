<template>
  <v-btn
    fab
    max-width="36"
    max-height="36"
    v-if="level"
    :class="'ma-0 pa-0 mr-1 ' + getBatteryColor(Math.round(level))"
    @click="() => {}"
  >
    <v-row class="ma-0 pa-0">
      <v-col class="ma-0 pa-0">
        <v-row class="ma-0 pa-0">
          <v-col class="ma-0 pa-0">
            <v-icon size="14">{{ getBatteryIcon(level) }}</v-icon>
          </v-col>
        </v-row>
        <v-row class="ma-0 pa-0">
          <v-col class="ma-0 mt-n1 pa-0 small">
              {{ level }}
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-btn>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">

export default {
  name: 'BatteryIndicator',

  props: {
    level: {}
  },

  data: () => ({
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    getBatteryIcon: function (level) {
      if (level >= 75) {
        return 'battery_charging_full'
      }
      if (level >= 20) {
        return 'battery_full'
      }
      return 'battery_alert'
    },

    getBatteryColor: function (level) {
      if (level >= 75) {
        return 'green darken-' + this.getMagicNumber(level, 75, 25, 4)
      }
      if (level >= 20) {
        return 'teal darken-' + this.getMagicNumber(level, 20, 55, 4)
      }
      return 'red darken-' + this.getMagicNumber(level, 0, 19, 4)
    },

    getMagicNumber: function (value, startingValue, numberOfValuesInStep, numberOfSteps) {
      return Math.floor((value - startingValue) / (numberOfValuesInStep / (numberOfSteps - 0.0001)) + 1)
    }
  }

}
</script>

<style lang="scss">
@import 'index.scss';

.small {
  font-size: 10px;
}
</style>
