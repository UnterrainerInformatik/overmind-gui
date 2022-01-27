<template>
  <KioskPanel
    v-if="weather"
    borderColor="secondary"
    :bgColor="colors[calculateTemperatureIndex(weather.temperature)]"
    min-width="270"
    max-width="270"
    :renderTitle="false"
  >
    <template>
      <!--
        <v-row><v-col>
        <div v-for="(color, i) in colors" :key="i" :class="color">{{descriptions[i]}}<br>{{color}}</div>
        </v-col></v-row>
      -->
      <v-card class="black ma-n2 pa-2" min-width="252" height="100%" max-width="252">
      <v-card-text class="pa-2">
        <v-row class="ma-0 pa-0 align-center">
          <v-col class="ma-0 pa-0 text-left">
            <div class="middle ma-0 pa-0">
              {{ $t('page.kiosk.zamg.temperature') }}:
            </div>
          </v-col>
          <v-col class="ma-0 pa-0 text-center">
            {{ weather.temperature }}
          </v-col>
        </v-row>
        <v-row class="ma-0 pa-0">
          <v-col class="ma-0 pa-0 text-left">
            <div class="middle ma-0 pa-0">
              {{ $t('page.kiosk.zamg.description') }}:<br />
              {{ $t('page.kiosk.zamg.wind') }}:<br />
              {{ $t('page.kiosk.zamg.feltTemp') }}:
            </div>
            <div class="small ma-0 pa-0">
              {{ $t('page.kiosk.zamg.sun') }}:<br />
              {{ $t('page.kiosk.zamg.rain') }}:
            </div>
          </v-col>
          <v-col class="ma-0 pa-0 text-left">
            <div class="middle ma-0 pa-0">
              {{
                calculateTemperatureDescription(
                  calculateFeltTemperature(
                    weather.temperature,
                    weather.wind.substring(weather.wind.indexOf(', ') + 2),
                    weather.humidity
                  )
                )
              }}<br />
              {{ weather.wind.substring(weather.wind.indexOf(', ') + 2) }}<br />
              {{
                calculateFeltTemperature(
                  weather.temperature,
                  weather.wind.substring(weather.wind.indexOf(', ') + 2),
                  weather.humidity
                ).toFixed(1)
              }}
            </div>
            <div class="small ma-0 pa-0">
              {{ weather.sun }}<br />
              {{ weather.rain }}
            </div>
          </v-col>
        </v-row>
        <v-row class="ma-0 mt-2 mb-n2 pa-0 align-center">
          <v-col class="ma-0 pa-0 text-center">
            <div class="small ma-0 pa-0">
              <v-icon x-small color="white">brightness_5</v-icon>
              &nbsp;&nbsp;{{ sunRise }} - {{ noon }} - {{ sunSet }}&nbsp;&nbsp;
              <v-icon x-small color="white">brightness_2</v-icon>
            </div>
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
    colors: ['white', 'blue lighten-5', 'blue lighten-4', 'blue lighten-3', 'teal lighten-3', 'teal lighten-1', 'green lighten-2', 'lime lighten-1', 'amber lighten-2', 'orange lighten-2'],
    descriptions: ['t < -39', '-39 < t < -26', '-26 < t < -13', '-13 < t < 0', '0 < t < 6', '6 < t < 14', '14 < t < 20', '20 < t < 26', '26 < t < 32', '32 < t < 38', '38 < t'],
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
      return this.$t('page.kiosk.zamg.tempDesc' + this.calculateTemperatureIndex(temperature))
    },
    calculateTemperatureIndex (temperature) {
      const temp = parseFloat(temperature)
      if (temp < -39) {
        return 0
      }
      if (temp < -26) {
        return 1
      }
      if (temp < -13) {
        return 2
      }
      if (temp < 0) {
        return 3
      }
      if (temp < 6) {
        return 4
      }
      if (temp < 14) {
        return 5
      }
      if (temp < 20) {
        return 6
      }
      if (temp < 26) {
        return 7
      }
      if (temp < 32) {
        return 8
      }
      if (temp < 38) {
        return 9
      }
      return 10
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
.bold {
  font-weight: bold;
}
</style>
