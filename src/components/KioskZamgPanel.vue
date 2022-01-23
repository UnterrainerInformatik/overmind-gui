<template>
  <KioskPanel
    v-if="weather"
    borderColor="secondary"
    bgColor="black"
    min-width="270"
    :renderTitle="false"
  >
    <template>
      <v-row class="ma-0 pa-0">
        <v-col class="ma-0 pa-0 text-left">
          <div class="middle ma-0 pa-0">
            {{ $t('page.kiosk.zamg.temperature') }}:<br />
            {{ $t('page.kiosk.zamg.wind') }}:<br />
            {{ $t('page.kiosk.zamg.feltTemp') }}:<br />
            {{ $t('page.kiosk.zamg.description') }}:
          </div>
          <div class="small ma-0 pa-0">
            {{ $t('page.kiosk.zamg.sun') }}:<br />
            {{ $t('page.kiosk.zamg.rain') }}:<br />
            {{ $t('page.kiosk.zamg.sunRise') }}:<br />
            {{ $t('page.kiosk.zamg.noon') }}:<br />
            {{ $t('page.kiosk.zamg.sunSet') }}:
          </div>
        </v-col>
        <v-col class="ma-0 pa-0 text-left">
          <div class="middle ma-0 pa-0">
            {{ weather.temperature }}<br />
            {{ weather.wind.substring(weather.wind.indexOf(', ') + 2) }}<br />
            {{
              calculateFeltTemperature(
                weather.temperature,
                weather.wind.substring(weather.wind.indexOf(', ') + 2),
                weather.humidity
              ).toFixed(1)
            }}<br />
            {{
              calculateTemperatureDescription(
                calculateFeltTemperature(
                  weather.temperature,
                  weather.wind.substring(weather.wind.indexOf(', ') + 2),
                  weather.humidity
                )
              )
            }}
          </div>
          <div class="small ma-0 pa-0">
            {{ weather.sun }}<br />
            {{ weather.rain }}<br />
            {{ sunRise }}<br />
            {{ noon }}<br />
            {{ sunSet }}
          </div>
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
import { singleton as sunRiseSetService } from '@/utils/webservices/sunRiseSetService'

export default {
  name: 'KioskZamgPanel',

  props: {
  },

  components: {
    KioskPanel
  },

  data: () => ({
    dateUtils,
    weather: null,
    sunRise: null,
    sunSet: null,
    noon: null
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
      }).then(() => {
        sunRiseSetService.getRiseSet(48.21392297830925, 14.458790098939307, dateUtils.getUtc()).then((response) => {
          if (response == null) {
            this.sunRise = null
            this.sunSet = null
            this.noon = null
          } else {
            this.sunRise = dateUtils.dateToShortTime(new Date(response.sunRise + 'Z'), this.$i18n.locale)
            this.noon = dateUtils.dateToShortTime(new Date(response.noon + 'Z'), this.$i18n.locale)
            this.sunSet = dateUtils.dateToShortTime(new Date(response.sunSet + 'Z'), this.$i18n.locale)
          }
        })
      })
    },
    calculateFeltTemperature (temperature, wind, hum) {
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
      const temp = parseFloat(temperature)
      if (temp < -39) {
        return this.$t('page.kiosk.zamg.tempDesc0')
      }
      if (temp < -26) {
        return this.$t('page.kiosk.zamg.tempDesc1')
      }
      if (temp < -13) {
        return this.$t('page.kiosk.zamg.tempDesc2')
      }
      if (temp < 0) {
        return this.$t('page.kiosk.zamg.tempDesc3')
      }
      if (temp < 6) {
        return this.$t('page.kiosk.zamg.tempDesc4')
      }
      if (temp < 14) {
        return this.$t('page.kiosk.zamg.tempDesc5')
      }
      if (temp < 20) {
        return this.$t('page.kiosk.zamg.tempDesc6')
      }
      if (temp < 26) {
        return this.$t('page.kiosk.zamg.tempDesc7')
      }
      if (temp < 32) {
        return this.$t('page.kiosk.zamg.tempDesc8')
      }
      if (temp < 38) {
        return this.$t('page.kiosk.zamg.tempDesc9')
      }
      return this.$t('page.kiosk.zamg.tempDesc10')
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
  font-weight: normal;
  line-height: 20px;
}
.small {
  font-size: 10px;
  font-weight: normal;
  line-height: 10px;
}
</style>
