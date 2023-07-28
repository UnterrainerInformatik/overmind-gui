<template>
  <KioskPanel
    class="noFocus"
    borderColor="secondary"
    :renderTitle="false"
    bgColor="black"
    min-width="350"
    max-width="350"
    min-height="150px"
    :ripple="false"
  >
    <template>
      <FlipCard ref="flipCard">
        <template slot="front">
          <v-card>
            <v-row v-for="(row, i) in appliances" :key="i">
              <v-col
                v-for="(app, j) in row"
                :key="j"
                :class="
                  'ma-0 pa-0' +
                  (j !== row.length - 1 ? ' mr-1' : '') +
                  (i === appliances.length - 1 ? ' mb-n1' : '')
                "
              >
                <v-row>
                  <v-col>
                    <v-card v-if="app">
                      <v-row class="ma-0 pa-0">
                        <v-col
                          class="ma-0 pa-0"
                          v-if="app && app.isNegativeEnabled"
                        >
                          <v-progress-linear
                            :reverse="true"
                            v-ripple="true"
                            striped
                            :height="app.isBattery ? 28 : 32"
                            :class="
                              'ma-0 text-center' +
                              (app.isBattery ? ' rounded-b-0' : ' mb-1')
                            "
                            :color="getNegativeColor(app)"
                            :value="
                              app.percent
                                ? app.percent < 0
                                  ? -app.percent
                                  : undefined
                                : undefined
                            "
                            @click.stop="frontClicked(i, j)"
                          >
                            <v-row>
                              <v-col
                                cols="1"
                                v-for="(icon, g) in app.icons"
                                :key="g"
                              >
                                <v-icon>{{ icon }}</v-icon>
                              </v-col>
                              <v-col v-if="app.percent < 0">{{
                                app.power
                              }}</v-col>
                            </v-row>
                          </v-progress-linear>
                        </v-col>
                        <v-col class="ma-0 pa-0">
                          <v-progress-linear
                            v-ripple="true"
                            striped
                            :height="app.isBattery ? 28 : 32"
                            :class="
                              'ma-0 text-center' +
                              (app.isBattery ? ' rounded-b-0' : ' mb-1')
                            "
                            :color="getColor(app)"
                            :value="
                              app.percent
                                ? app.percent >= 0
                                  ? app.percent
                                  : undefined
                                : undefined
                            "
                            @click.stop="frontClicked(i, j)"
                          >
                            <v-row>
                              <v-col
                                cols="1"
                                v-for="(icon, g) in app.icons"
                                :key="g"
                              >
                                <v-icon v-if="!app.isNegativeEnabled">{{
                                  icon
                                }}</v-icon>
                              </v-col>
                              <v-col v-if="app.percent >= 0">{{
                                app.power
                              }}</v-col>
                            </v-row>
                          </v-progress-linear>
                        </v-col>
                      </v-row>
                    </v-card>
                    <v-card v-if="app && app.isBattery">
                      <div class="progress-container">
                        <v-progress-linear
                          v-for="i in 6"
                          :key="i"
                          striped
                          buffer-value="100"
                          height="4"
                          class="segment"
                          :color="segmentColor(app.batteryPercent, i)"
                          :value="segmentPercent(app.batteryPercent, i)"
                        >
                        </v-progress-linear>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-card>
        </template>
        <template slot="back">
          <v-card
            class="ma-0 ml-n6 pa-0"
            min-width="340px"
            min-height="140px"
            @click="backClicked()"
          >
            <v-card-text v-if="showDetailsOf" class="ma-0 pa-0">
              <v-card class="ma-0 pa-0 text-left" elevation="0">
                <v-card-text
                  class="ma-0 pa-0 small"
                  elevation="0"
                  v-for="(app, i) in detailApps"
                  :key="i"
                >
                  <span class="bold">{{ app.power }}</span
                  >: {{ app.name }}
                </v-card-text>
              </v-card>
            </v-card-text>
          </v-card>
        </template>
      </FlipCard>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import FlipCard from '@/components/FlipCard.vue'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as overmindUtils } from '@/utils/overmindUtils'
import { singleton as jsUtils } from '@/utils/jsUtils'
import { Debouncer } from '@/utils/debouncer'

export default {
  name: 'KioskPowerPanel',

  props: {
    data: { default: null }
  },

  components: {
    KioskPanel,
    FlipCard
  },

  data: () => ({
    jsUtils,
    overmindUtils,
    interval: null,
    appliances: null,
    showDetailsOf: null,
    debouncer: new Debouncer()
  }),

  computed: {
    detailApps: {
      get () {
        const a = this.appliances[this.showDetailsOf.rowIndex][this.showDetailsOf.appIndex].appliances.filter(e => {
          return e.powerRaw > 1 || e.powerRaw < -1
        })
        a.sort((a, b) => {
          return a.powerRaw === b.powerRaw ? 0 : a.powerRaw < b.powerRaw ? 1 : -1
        })
        a.splice(12)
        return a
      }
    }
  },

  watch: {
  },

  methods: {
    frontClicked (rowIndex, appIndex) {
      if (!this.$refs.flipCard.showBack) {
        this.showDetailsOf = {
          rowIndex,
          appIndex
        }
      }
      this.$refs.flipCard.flip()
    },
    backClicked () {
      this.$refs.flipCard.flip()
    },
    getColor (app) {
      if (!app.gradient || app.percent == null || app.percent === undefined) {
        return app.color + ' darken-3'
      }
      const from = app.gradient.from
      const to = app.gradient.to
      const p = app.percent / 100
      return overmindUtils.lerpColorArrayToRgba(from, to, p)
    },
    getNegativeColor (app) {
      if (!app.negativeGradient || app.percent == null || app.percent === undefined) {
        return app.negativeColor + ' darken-3'
      }
      const from = app.negativeGradient.from
      const to = app.negativeGradient.to
      const p = app.percent / 100
      return overmindUtils.lerpColorArrayToRgba(from, to, p)
    },
    getBatteryColor (app) {
      if (!app.batteryGradient || app.batteryPercent == null || app.batteryPercent === undefined) {
        return app.batteryColor + ' darken-3'
      }
      const from = app.batteryGradient.from
      const to = app.batteryGradient.to
      const p = app.batterPercent / 100
      return overmindUtils.lerpColorArrayToRgba(from, to, p)
    },
    getPower (appliance, indexes, names) {
      let power = 0
      if (indexes) {
        power = this.getPowerByIndexes(appliance, indexes)
      }
      if (names) {
        power = this.getPowerByNames(appliance, names)
      }
      return power
    },
    getPowerByIndexes (appliance, indexes) {
      let power = 0
      for (let u = 0; u < indexes.length; u++) {
        const i = indexes[u]
        if (appliance.state && appliance.state.relays && appliance.state.relays[i] && appliance.state.relays[i].power) {
          if (appliance.negate) {
            power -= appliance.state.relays[i].power
          } else {
            power += appliance.state.relays[i].power
          }
        }
      }
      return power
    },
    getPowerByNames (appliance, names) {
      let power = 0
      for (let u = 0; u < names.length; u++) {
        const name = names[u]
        if (appliance.state && appliance.state[name]) {
          if (appliance.negate) {
            power -= appliance.state[name]
          } else {
            power += appliance.state[name]
          }
        }
      }
      return power
    },
    async getAppliances () {
      const r = []
      for (const dataRow of this.data) {
        const row = []
        for (const d of dataRow) {
          const appliances = []
          const p = await this.getAppliancesData(d.appliances, appliances)

          const batteryAppliances = []
          const bp = await this.getAppliancesData(d.batteryAppliances, batteryAppliances)

          let max = d.max
          if (d.isNegativeEnabled && p < 0) {
            max = d.negativeMax
          }
          const percent = max ? (100 / max * p) : null
          const obj = {
            icons: d.icons,

            appliances: appliances,
            power: overmindUtils.formatPower(p),
            max: max,
            percent: percent,
            gradient: d.gradient,
            color: d.color ? d.color : 'green',

            isNegativeEnabled: d.isNegativeEnabled,
            negativeMax: d.negativeMax,
            negativeGradient: d.negativeGradient,
            negativeColor: d.negativeColor ? d.negativeColor : 'orange',

            isBattery: d.batteryAppliances !== undefined && d.batteryAppliances !== null,
            batteryAppliances: batteryAppliances,
            batteryMax: d.batteryMax,
            batteryPercent: bp < 0 ? 0 : bp > 100 ? 100 : bp,
            batteryGradient: d.batteryGradient,
            batteryColor: d.batteryColor ? d.batteryColor : 'yellow'
          }
          row.push(obj)
        }
        r.push(row)
      }
      this.appliances = r
    },
    async getAppliancesData (appliances, list) {
      let p = 0
      if (!appliances) {
        return p
      }
      const aa = await jsUtils.resolveCollection(appliances, async (item) => appliancesService.getById(item.id))
      let i = 0
      for (const appliance of appliances) {
        const a = aa[i]
        overmindUtils.parseState(a)
        overmindUtils.parseConfig(a)
        a.negate = appliance.negate
        a.powerRaw = this.getPower(a, appliance.indexes, appliance.names)
        a.power = overmindUtils.formatPower(a.powerRaw, true)
        p += a.powerRaw
        list.push(a)
        i++
      }
      return p
    },
    percentInverse (lb, ub, p) {
      const a = p - lb
      const b = 100 / (ub - lb)
      return a * b
    },
    segmentPercent (p, i) {
      const lb = 10
      const ub = 95
      if (p <= 10) {
        if (i === 1) {
          return this.percentInverse(0, lb, p)
        }
      } else if (p > lb && p <= 25) {
        if (i === 2) {
          return this.percentInverse(lb, 25, p)
        }
        if (i < 2) {
          return 100
        }
      } else if (p > 25 && p <= 50) {
        if (i === 3) {
          return this.percentInverse(25, 50, p)
        }
        if (i < 3) {
          return 100
        }
      } else if (p > 50 && p <= 75) {
        if (i === 4) {
          return this.percentInverse(50, 75, p)
        }
        if (i < 4) {
          return 100
        }
      } else if (p > 75 && p <= ub) {
        if (i === 5) {
          return this.percentInverse(75, ub, p)
        }
        if (i < 5) {
          return 100
        }
      } else {
        if (i === 6) {
          return this.percentInverse(ub, 100, p)
        }
        if (i < 6) {
          return 100
        }
      }
      return 0
    },
    segmentColor (p, i) {
      if (i === 1) {
        return 'rgb(255, 255, 0, 0.7)'
      }
      if (i === 6) {
        return 'rgb(200, 130, 0, 0.8)'
      }
      return 'rgb(0, 255, 0, 0.9)'
    }
  },

  mounted () {
    this.debouncer.debounce(this.getAppliances())
    this.interval = setInterval(() => this.debouncer.debounce(this.getAppliances()), 2000)
  },

  beforeDestroy () {
    clearInterval(this.interval)
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
  font-size: 12px;
  font-weight: normal;
  line-height: 12px;
}
.bold {
  font-weight: bold;
}

.progress-container {
  display: flex;
}
.segment {
  width: 100%;
  height: 0.3rem;
}
.segment:not(:first-child) {
  margin-left: 2px;
}
.segment:first-child {
  width: 40%;
  border-bottom-left-radius: 10px;
}
.segment:last-child {
  width: 40%;
  border-bottom-right-radius: 10px;
}
</style>
