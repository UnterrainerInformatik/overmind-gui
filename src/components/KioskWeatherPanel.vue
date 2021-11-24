<template>
  <KioskPanel v-if="weather" borderColor="secondary" min-width="235">
    <template v-slot:title>
      <v-avatar color="secondary" size="90">
        <v-img
          :src="
            require(`@/assets/weather/weather/${weather.day['1'].symbol_value}.png`)
          "
          max-width="70"
          contain
        ></v-img>
      </v-avatar>
      &nbsp;&nbsp;
      <v-avatar color="secondary" size="90">
        <v-row class="ma-0 pa-0">
          <v-col class="ma-0 pa-0">
            <v-row class="ma-0 pa-0">
              <v-col class="ma-0 pa-0">
                <v-img
                  v-if="weather"
                  :src="
                    require(`@/assets/weather/wind/${weather.day['1'].wind.symbolB}.png`)
                  "
                  max-width="30"
                  contain
                ></v-img>
              </v-col>
            </v-row>
            <v-row class="ma-0 pa-0">
              <v-col class="ma-0 pa-0">
                <span class="text-caption text-no-wrap my-small-text">
                  {{ weather.day['1'].wind.speed }}-{{
                    weather.day['1'].wind.gusts
                  }}
                  {{ weather.day['1'].units.wind }}
                </span>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-avatar>
    </template>
    <template>
      {{ weather.day['1'].symbol_description }}
      <br>
      ({{ makeShortDateTime(weather.day['1'].date, weather.day['1'].local_time) }})
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
  name: 'KioskWeatherPanel',

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
    update () {
      localizedDataService.getByIdentifier('daswetter').then((response) => {
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
</style>
