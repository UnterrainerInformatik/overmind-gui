<template>
  <KioskPanel
    v-if="wasteDisposalJson"
    borderColor="secondary"
    bgColor="black"
    min-width="140px"
    :renderTitle="false"
  >
    <template>
      <v-container class="ma-0 pa-0 d-fluid" v-if="data">
        <v-row v-for="(item, i) in filteredData" :key="i">
          <v-col class="ma-1 pa-0" v-if="item.show">
            <v-card
              outlined
              :class="'ma-0 pa-0 ' + item.color"
            >
              <v-card
                :class="
                  'fill-height elevation-0 ma-0 px-3 py-1 noFocus ' +
                  (item.warn ? item.color : 'disabled darken-4')
                "
                ><v-row class="ma-0 pa-0"
                  ><v-col
                    :class="
                      'ma-0 ml-n2 pa-0 small ' +
                      (item.warn ? 'black--text' : '')
                    "
                    >{{ $t('page.kiosk.wasteBin.' + item.name) }}</v-col
                  >
                  <v-col class="ma-0 ml-1 mr-n5 pa-0">
                    <v-icon color="black" small v-if="item.warn">logout</v-icon>
                    <v-icon small v-if="item.return">input</v-icon>
                  </v-col>
                  <v-col
                    :class="
                      'ma-0 mr-n3 pa-0 ' + (item.warn ? 'black--text' : '')
                    "
                    >{{ item.date.substring(0, 5) }}</v-col
                  ></v-row
                ></v-card
              >
            </v-card>
          </v-col>
        </v-row>
      </v-container>
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
import { Debouncer } from '@/utils/debouncer'

export default {
  name: 'KioskWasteDisposalPanel',

  props: {
    waste: { default: true },
    organic: { default: true },
    plastic: { default: true },
    paper: { default: true },
    wasteWarnDaysBefore: { default: 1 },
    organicWarnDaysBefore: { default: 1 },
    plasticWarnDaysBefore: { default: 1 },
    paperWarnDaysBefore: { default: 1 }
  },

  components: {
    KioskPanel
  },

  data: () => ({
    interval: null,
    dateUtils,
    wasteDisposalJson: null,
    data: null,
    debouncer: new Debouncer()
  }),

  computed: {
    filteredData: {
      get () {
        return this.data.filter(e => {
          return e !== null
        })
      }
    }
  },

  watch: {
  },

  methods: {
    async update () {
      await localizedDataService.getByIdentifier('wasteDisposalEnns').then((response) => {
        if (response == null) {
          return
        }

        if (this.$i18n.locale === 'de') {
          this.wasteDisposalJson = JSON.parse(response.de)
        } else {
          this.wasteDisposalJson = JSON.parse(response.en)
        }

        const now = new Date()
        // Get yesterday to be able to display return-time as well.
        now.setDate(now.getDate() - 1)
        const d = []

        d.push(this.findFirstFutureDate(now, this.wasteDisposalJson.wasteBinDates, this.waste, 'waste', 'deep-orange', this.wasteWarnDaysBefore + 1))
        d.push(this.findFirstFutureDate(now, this.wasteDisposalJson.organicWasteBinDates, this.organic, 'organic', 'green darken-3', this.organicWarnDaysBefore + 1))
        d.push(this.findFirstFutureDate(now, this.wasteDisposalJson.plasticWasteBinDates, this.plastic, 'plastic', 'yellow darken-1', this.plasticWarnDaysBefore + 1))
        d.push(this.findFirstFutureDate(now, this.wasteDisposalJson.paperWasteBinDates, this.paper, 'paper', 'red darken-2', this.paperWarnDaysBefore + 1))
        this.data = d
      })
    },
    findFirstFutureDate (now, dates, show, name, color, warnDaysBefore) {
      for (const ds of dates) {
        const ps = ds.split('.')
        const d = new Date(ps[2], ps[1] - 1, ps[0])
        if (d > now) {
          const distance = (d - now) / 1000 / 60 / 60 / 24
          return {
            date: dateUtils.dateToDatePadded(d, this.$i18n.locale),
            distanceInDays: distance,
            warn: distance <= warnDaysBefore && distance >= 0.5,
            return: distance < 0.5,
            show,
            name,
            color
          }
        }
      }
      return null
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
.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
