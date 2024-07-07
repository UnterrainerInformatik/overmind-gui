<template>
  <KioskPanel
    v-if="weather"
    borderColor="secondary"
    bgColor="black"
    min-width="70"
    max-width="70"
    :renderTitle="false"
  >
    <template>
      <v-card
        class="black ma-n3 pa-1"
        min-width="60"
        max-width="60"
        height="140"
      >
        <v-card-text class="pa-1">
          <v-row class="ma-0 mt-0 mb-5 pa-0 align-center">
            <v-col
              class="small ma-0 pa-0 text-center"
              style="font-weight: bold"
            >
              <v-avatar
                class="mt-5 mb-5"
                size="36"
                color="blue"
              >
                <v-icon color="black">water_drop</v-icon>
              </v-avatar>
              124,2536m³
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import { singleton as overmindUtils } from '@/utils/overmindUtils'
import { singleton as dateUtils } from '@/utils/dateUtils'
import { singleton as localizedDataService } from '@/utils/webservices/localizedDataService'
import { singleton as sunRiseSetService } from '@/utils/webservices/sunRiseSetService'
import { Debouncer } from '@/utils/debouncer'

export default {
  name: 'KioskWatermeterPanel',

  props: {
  },

  components: {
    KioskPanel
  },

  data: () => ({
    interval: null,
    overmindUtils,
    dateUtils,
    weather: null,
    sunRise: null,
    sunSet: null,
    noon: null,
    debouncer: new Debouncer()
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
    async update () {
      await localizedDataService.getByIdentifier('zamg').then((response) => {
        if (response == null) {
          return
        }

        if (this.$i18n.locale === 'de') {
          this.weather = JSON.parse(response.de)
        } else {
          this.weather = JSON.parse(response.en)
        }
        // console.log(this.weather)
      })
      await sunRiseSetService.getRiseSet(48.21392297830925, 14.458790098939307, dateUtils.getUtc()).then((response) => {
        if (response == null) {
          this.sunRise = null
          this.sunSet = null
          this.noon = null
        } else {
          this.sunRise = dateUtils.dateToShortTime(new Date(response.sunRise), this.$i18n.locale)
          this.noon = dateUtils.dateToShortTime(new Date(response.noon), this.$i18n.locale)
          this.sunSet = dateUtils.dateToShortTime(new Date(response.sunSet), this.$i18n.locale)
        }
      })
    },
    calculateFeltTemperature (temperature, wind, hum) {
      if (typeof wind !== 'number') {
        console.log('weather.wind is not a number')
        wind = 0
      }
      if (typeof hum !== 'number') {
        console.log('weather.humidity is not a number')
        hum = 0
      }
      const temp = parseFloat(temperature)
      if (temp < 15) {
        return this.calculateWindChillTemperature(temp, parseFloat(wind))
      }
      if (temp < 27) {
        return parseFloat(temp)
      }
      return this.calculateHeatIndex(temp, parseFloat(hum))
    },
    calculateWindChillTemperature (temperature, wind) {
      const temp = parseFloat(temperature)
      const pWind = Math.pow(parseFloat(wind), 0.16)
      return 13.12 + 0.6215 * temp - 11.37 * pWind + 0.3965 * temp * pWind
    },
    calculateHeatIndex (temperature, humidity) {
      const temp = parseFloat(temperature)
      const hum = parseFloat(humidity)
      const c1 = -8.78469475556
      const c2 = 1.61139411
      const c3 = 2.33854883889
      const c4 = -0.14611605
      const c5 = -0.012308094
      const c6 = -0.0164248277778
      const c7 = 0.002211732
      const c8 = 0.00072546
      const c9 = -0.000003582
      const pTemp = Math.pow(temp, 2)
      const pHum = Math.pow(hum, 2)
      return c1 + c2 * temp + c3 * hum + c4 * temp * hum + c5 * pTemp + c6 * pHum + c7 * pTemp * hum + c8 * temp * pHum + c9 * pTemp * pHum
    },
    calculateTemperatureDescription (temperature) {
      return this.$t('page.kiosk.zamg.tempDesc' + this.overmindUtils.calculateTemperatureIndex(temperature))
    }
  },

  mounted () {
    this.debouncer.debounce(async () => this.update())
    this.interval = setInterval(() => this.debouncer.debounce(async () => this.update()), 10000)
  },

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
    }
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
