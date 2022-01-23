<template>
  <KioskPanel v-if="weather" borderColor="secondary" bgColor="black" min-width="270">
    <template>
      <v-row class="ma-0 pa-0">
        <v-col class="ma-0 pa-0 text-left middle">
          {{ $t('page.kiosk.zamg.temperature') }}:<br />
          {{ $t('page.kiosk.zamg.wind') }}:<br />
          <span class="small">{{ $t('page.kiosk.zamg.windTop') }}:</span><br />
          {{ $t('page.kiosk.zamg.sun') }}:<br />
          {{ $t('page.kiosk.zamg.rain') }}:<br />
          <span class="small">{{ $t('page.kiosk.zamg.humidity') }}:</span><br />
          <span class="small">{{ $t('page.kiosk.zamg.airPressure') }}:</span>
        </v-col>
        <v-col class="ma-0 pa-0 text-left middle">
          {{ weather.temperature }}<br />
          {{ weather.wind }}<br />
          <span class="small">{{ weather.windTop }}</span><br />
          {{ weather.sun }}<br />
          {{ weather.rain }}<br />
          <span class="small">{{ weather.humidity }}</span><br />
          <span class="small">{{ weather.airPressure }}</span>
          <br />
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
import { singleton as localizedDataService } from '@/utils/webservices/localizedDataService'

export default {
  name: 'KioskZamgPanel',

  props: {
  },

  components: {
    KioskPanel
  },

  data: () => ({
    dateUtils,
    weather: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    parseDate (date, time) {
      return new Date(date.substring(0, 4) + '-' + date.substring(4, 6) + '-' + date.substring(6, 8) + ' ' + time + ':00.000')
    },
    makeShortDateTime (date, time) {
      const d = this.parseDate(date, time)
      return dateUtils.dateToShortDateTime(d, this.$i18n.locale)
    },
    makeShortDate (date, time) {
      const d = this.parseDate(date, time)
      return dateUtils.dateToDatePadded(d, this.$i18n.locale)
    },
    makeShortTime (date, time) {
      const d = this.parseDate(date, time)
      return dateUtils.dateToShortTime(d, this.$i18n.locale)
    },
    update () {
      localizedDataService.getByIdentifier('zamg').then((response) => {
        if (response == null) {
          return
        }

        if (this.$i18n.locale === 'de') {
          this.weather = JSON.parse(response.de)
        } else {
          this.weather = JSON.parse(response.en)
        }
      })
    }
  },

  mounted () {
    this.update()
    setInterval(() => this.update(), 10000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.middle {
  font-size: 15px;
}
.small {
  font-size: 10px;
}
</style>
