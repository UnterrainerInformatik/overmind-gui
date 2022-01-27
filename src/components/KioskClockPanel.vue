<template>
  <KioskPanel borderColor="secondary" bgColor="black">
    <template v-slot:title>
      <v-row>
        <v-col class="ma-0 pa-0 text-center text-button" style="font-weight: bold;">
          {{ dateUtils.dateToDateLong(date, $i18n.locale).split(',')[0] }}<br />
        </v-col>
      </v-row>
    </template>
    <template>
      <v-row class="ma-0 mb-2 pa-0">
        <v-col class="ma-0 mt-2 pa-0 text-h4 text-center">
          {{ dateUtils.dateToTime(date, $i18n.locale) }}
        </v-col>
      </v-row>
      <v-row class="ma-0 pa-0" fill-height>
        <v-col class="ma-0 mt-4 pa-0 heading text-center">
          {{ dateUtils.dateToDatePadded(date, $i18n.locale).split('.')[0] }}.{{ dateUtils.dateToDatePadded(date, $i18n.locale).split('.')[1] }}<br />
        </v-col>
      </v-row>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import { singleton as dateUtils } from '@/utils/dateUtils'

export default {
  name: 'KioskClockPanel',

  props: {
  },

  components: {
    KioskPanel
  },

  data: () => ({
    dateUtils,
    date: new Date()
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    update () {
      this.date = new Date()
    }
  },

  mounted () {
    setInterval(() => this.update(), 1000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.heading {
  font-size: 15px;
  line-height: 20px;
}
</style>
