<template>
  <KioskPanel v-if="weather" borderColor="secondary" min-width="335">
    <template>
      <v-row class="ma-0 pa-0">
        <v-col class="ma-0 pa-0 text-center small">
          {{
            makeShortDate(weather.day['1'].date, weather.day['1'].local_time)
          }}
          <br />
          <v-img
            max-width="100"
            :src="
              require(`@/assets/weather/weather/${weather.day['1'].symbol_value}.svg`)
            "
            contain
          ></v-img>
          {{ weather.day['1'].symbol_description }}
        </v-col>
        <v-col class="ma-0 pa-0 text-center small">
          {{
            makeShortDate(weather.day['2'].date, weather.day['2'].local_time)
          }}
          <br />
          <v-img
            max-width="100"
            :src="
              require(`@/assets/weather/weather/${weather.day['2'].symbol_value}.svg`)
            "
            contain
          ></v-img>
          {{ weather.day['2'].symbol_description }}
        </v-col>
        <v-col class="ma-0 pa-0 text-center small">
          {{
            makeShortDate(weather.day['3'].date, weather.day['3'].local_time)
          }}
          <br />
          <v-img
            max-width="100"
            :src="
              require(`@/assets/weather/weather/${weather.day['3'].symbol_value}.svg`)
            "
            contain
          ></v-img>
          {{ weather.day['3'].symbol_description }}
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
    makeShortDate (date, time) {
      const d = this.parseDate(date, time)
      return dateUtils.dateToDatePadded(d, this.$i18n.locale)
    },
    makeShortTime (date, time) {
      const d = this.parseDate(date, time)
      return dateUtils.dateToShortTime(d, this.$i18n.locale)
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

.small {
  font-size: 10px;
}
</style>
