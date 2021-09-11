<template>
  <v-row class="ma-0 pa-0 justify-end">
    <v-col class="ma-0 pa-0">
      <v-row class="ma-0 pa-0 justify-end">
        <v-col cols="8" md="4" lg="3" class="ma-0 pa-0 text-left">
          <span class="text-caption font-weight-bold text-no-wrap"
            >{{ $t('sensors.lastTimeOnline') }}:</span
          >
        </v-col>
      </v-row>
      <v-row class="ma-0 pa-0 justify-end">
        <v-col cols="8" md="4" lg="3" class="ma-0 pa-0 text-left text-no-wrap">
          <span class="text-caption">
            {{ dateUtils.isoToDatePadded(value, $i18n.locale) }}</span
          >
          <span class="text-caption">
            ({{ dateUtils.isoToTime(value, $i18n.locale) }})</span
          >
        </v-col>
      </v-row>
    </v-col>
  </v-row>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import dateUtils from '@/utils/dateUtils'

export default {
  name: 'LastTimeOnlineDisplay',

  props: {
    value: {}
  },

  data: () => ({
    dateUtils
  }),

  computed: {
  },

  watch: {
  },

  methods: {
  }

}
</script>
