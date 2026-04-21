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
import { SseClient } from '@/utils/sseClient'

function buildPerAppliance (appliances) {
  if (!appliances) {
    return []
  }
  return appliances.map(a => ({
    applianceId: a.id,
    paths: a.indexes
      ? a.indexes.map(i => `relays[${i}].power`)
      : (a.names ? a.names.slice() : [])
  })).filter(e => e.paths.length > 0)
}

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
    appliances: [],
    showDetailsOf: null,
    detailApps: [],
    detailHandle: null,
    detailEpoch: 0,
    nameById: new Map()
  }),

  computed: {
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
        this.openDetailTransport(rowIndex, appIndex)
      }
      this.$refs.flipCard.flip()
    },
    backClicked () {
      this.$refs.flipCard.flip()
      this.closeDetailTransport()
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
    initCells () {
      const grid = []
      for (let rowIndex = 0; rowIndex < this.data.length; rowIndex++) {
        const row = []
        for (let appIndex = 0; appIndex < this.data[rowIndex].length; appIndex++) {
          const d = this.data[rowIndex][appIndex]
          row.push({
            rowIndex,
            appIndex,
            d,
            icons: d.icons,
            isNegativeEnabled: d.isNegativeEnabled,
            isBattery: d.batteryAppliances !== undefined && d.batteryAppliances !== null,
            power: overmindUtils.formatPower(0),
            percent: null,
            color: d.color ? d.color : 'green',
            gradient: d.gradient,
            negativeColor: d.negativeColor ? d.negativeColor : 'orange',
            negativeGradient: d.negativeGradient,
            max: d.max,
            negativeMax: d.negativeMax,
            batteryMax: d.batteryMax,
            batteryPercent: 0,
            batteryColor: d.batteryColor ? d.batteryColor : 'yellow',
            batteryGradient: d.batteryGradient,
            sampleCount: 0,
            batterySampleCount: 0,
            powerHandle: null,
            batteryHandle: null
          })
        }
        grid.push(row)
      }
      this.appliances = grid
    },
    uniqueIds () {
      const ids = new Set()
      for (const row of this.data) {
        for (const d of row) {
          if (d.appliances) {
            for (const a of d.appliances) {
              ids.add(a.id)
            }
          }
          if (d.batteryAppliances) {
            for (const a of d.batteryAppliances) {
              ids.add(a.id)
            }
          }
        }
      }
      return ids
    },
    async loadNames () {
      const ids = this.uniqueIds()
      const nameById = new Map()
      await jsUtils.resolveCollection(Array.from(ids), async (id) => {
        const a = await appliancesService.getById(id)
        nameById.set(id, a && a.name ? a.name : String(id))
        return a
      })
      this.nameById = nameById
    },
    onCellPowerUpdate (cell, payload) {
      if (!payload || !payload.aggregate) {
        return
      }
      const agg = payload.aggregate
      cell.sampleCount = agg.sampleCount
      const value = agg.sampleCount === 0 ? 0 : (agg.value == null ? 0 : agg.value)
      cell.power = overmindUtils.formatPower(value)
      if (agg.sampleCount === 0) {
        cell.percent = null
      } else {
        let max = cell.d.max
        if (cell.d.isNegativeEnabled && value < 0) {
          max = cell.d.negativeMax
        }
        cell.percent = max ? (100 / max * value) : null
      }
    },
    onCellBatteryUpdate (cell, payload) {
      if (!payload || !payload.aggregate) {
        return
      }
      const agg = payload.aggregate
      cell.batterySampleCount = agg.sampleCount
      const value = agg.sampleCount === 0 ? 0 : (agg.value == null ? 0 : agg.value)
      const bp = cell.batteryMax ? (100 / cell.batteryMax * value) : 0
      cell.batteryPercent = bp < 0 ? 0 : bp > 100 ? 100 : bp
    },
    async registerCellPower (cell) {
      const perAppliance = buildPerAppliance(cell.d.appliances)
      if (perAppliance.length === 0) {
        return
      }
      cell.powerHandle = await SseClient.getInstance().registerTransport({
        minInterval: 3000,
        selection: { perAppliance },
        aggregate: { op: 'sum' }
      }, (payload) => this.onCellPowerUpdate(cell, payload))
    },
    async registerCellBattery (cell) {
      const perAppliance = buildPerAppliance(cell.d.batteryAppliances)
      if (perAppliance.length === 0) {
        return
      }
      cell.batteryHandle = await SseClient.getInstance().registerTransport({
        minInterval: 3000,
        selection: { perAppliance },
        aggregate: { op: 'sum' }
      }, (payload) => this.onCellBatteryUpdate(cell, payload))
    },
    onDetailUpdate (cell, payload) {
      if (!payload || !payload.values) {
        return
      }
      const sums = new Map()
      for (const triple of payload.values) {
        const current = sums.get(triple.applianceId) || 0
        const v = typeof triple.value === 'number' ? triple.value : Number.parseFloat(triple.value)
        sums.set(triple.applianceId, current + (isNaN(v) ? 0 : v))
      }
      const list = []
      for (const a of cell.d.appliances) {
        const raw = sums.get(a.id) || 0
        list.push({
          id: a.id,
          name: this.nameById.get(a.id) || String(a.id),
          powerRaw: raw,
          power: overmindUtils.formatPower(raw, true)
        })
      }
      list.sort((x, y) => {
        return x.powerRaw === y.powerRaw ? 0 : x.powerRaw < y.powerRaw ? 1 : -1
      })
      const filtered = list.filter(e => e.powerRaw > 1 || e.powerRaw < -1)
      filtered.splice(12)
      this.detailApps = filtered
    },
    async openDetailTransport (rowIndex, appIndex) {
      this.closeDetailTransport()
      this.detailApps = []
      const epoch = this.detailEpoch
      const cell = this.appliances[rowIndex][appIndex]
      const perAppliance = buildPerAppliance(cell.d.appliances)
      if (perAppliance.length === 0) {
        return
      }
      const sse = SseClient.getInstance()
      const handle = await sse.registerTransport({
        minInterval: 2000,
        selection: { perAppliance }
      }, (payload) => {
        if (epoch !== this.detailEpoch) {
          return
        }
        this.onDetailUpdate(cell, payload)
      })
      if (epoch !== this.detailEpoch) {
        sse.unregisterTransport(handle)
        return
      }
      this.detailHandle = handle
    },
    closeDetailTransport () {
      this.detailEpoch++
      if (this.detailHandle) {
        SseClient.getInstance().unregisterTransport(this.detailHandle)
        this.detailHandle = null
      }
      this.detailApps = []
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

  async mounted () {
    this.initCells()
    await this.loadNames()
    for (const row of this.appliances) {
      for (const cell of row) {
        await this.registerCellPower(cell)
        if (cell.isBattery) {
          await this.registerCellBattery(cell)
        }
      }
    }
  },

  beforeDestroy () {
    const sse = SseClient.getInstance()
    for (const row of this.appliances) {
      for (const cell of row) {
        if (cell.powerHandle) {
          sse.unregisterTransport(cell.powerHandle)
          cell.powerHandle = null
        }
        if (cell.batteryHandle) {
          sse.unregisterTransport(cell.batteryHandle)
          cell.batteryHandle = null
        }
      }
    }
    this.detailEpoch++
    if (this.detailHandle) {
      sse.unregisterTransport(this.detailHandle)
      this.detailHandle = null
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
