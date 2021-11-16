<template>
<v-card :class="'success elevation-0 ' + ($vuetify.theme.dark ? 'darken-1' : 'darken-3')" width="70" min-width="70" outlined>
  <v-card :class="'ma-0 secondary text-center elevation-0 ' + ($vuetify.theme.dark ? 'darken-1 text--lighten-1' : 'text--darken-3') + ' grey--text'">
    <span class="text-caption text-no-wrap">{{
      dateUtils.isoToDatePadded(value, $i18n.locale)
    }}</span>
    <br />
    <span class="text-caption text-no-wrap">
      {{ dateUtils.isoToTime(value, $i18n.locale) }}</span
    >
  </v-card>
</v-card>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { singleton as dateUtils } from '@/utils/dateUtils'

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
