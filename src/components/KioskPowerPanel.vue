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
    @click="backClicked()"
  >
    <template>
      <FlipCard ref="flipCard">
        <template slot="front">
          front
        </template>
        <template slot="back">
          back
        </template>
      </FlipCard>
      <v-card>
        <v-card-text
          :class="'ma-0 pa-0 flip-card' + (showDetails ? ' flip' : '')"
        >
          <v-card class="flip-card-inner">
            <v-card-text class="ma-0 pa-0 flip-card-front">
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
                          <v-progress-linear
                            striped
                            :height="app.isBattery ? 28 : 32"
                            :class="
                              'ma-0 text-center' +
                              (app.isBattery ? ' rounded-b-0' : ' mb-1')
                            "
                            :color="getColor(app)"
                            :value="app.percent ? app.percent : undefined"
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
                              <v-col>{{ app.power }}</v-col>
                            </v-row>
                          </v-progress-linear>
                        </v-card>
                        <v-card v-if="app.isBattery">
                          <v-progress-linear
                            striped
                            stream
                            buffer-value="50"
                            height="4"
                            class="ma-0 mb-1 text-center rounded-t-0"
                            color="yellow darken-3"
                            :value="60"
                          >
                          </v-progress-linear>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-col>
                </v-row>
              </v-card>
            </v-card-text>
            <v-card-text class="ma-n3 pa-0 flip-card-back">
              <v-card class="ma-0 ml-n6 pa-0" min-width="340px" min-height="140px">
                <v-card-text v-if="showDetailsOf" class="ma-0 pa-0">
                  <v-card class="ma-0 pa-0 text-left grey darken-4">
                    <v-card-text
                      class="ma-0 pa-0 small"
                      v-for="(app, i) in detailApps"
                      :key="i"
                    >
                      <span class="bold">{{ app.power }}</span
                      >: {{ app.name }}
                    </v-card-text>
                  </v-card>
                </v-card-text>
              </v-card>
            </v-card-text>
          </v-card>
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
import FlipCard from '@/components/FlipCard.vue'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as overmindUtils } from '@/utils/overmindUtils'
import { singleton as jsUtils } from '@/utils/jsUtils'

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
    showDetails: false
  }),

  computed: {
    detailApps: {
      get () {
        const a = this.appliances[this.showDetailsOf.rowIndex][this.showDetailsOf.appIndex].appliances.filter(e => {
          return e.powerRaw > 0
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
      if (!this.showDetails) {
        this.showDetails = true
        this.showDetailsOf = {
          rowIndex,
          appIndex
        }
      } else {
        this.showDetails = false
      }
    },
    backClicked () {
      this.showDetails = false
    },
    getColor (app) {
      if (!app.gradient || app.percent == null || app.percent === undefined) {
        return app.color + ' darken-3'
      }
      const from = app.gradient.from
      const to = app.gradient.to
      const p = app.percent / 100
      return this.toRgba([
        jsUtils.lerp(from[0], to[0], p),
        jsUtils.lerp(from[1], to[1], p),
        jsUtils.lerp(from[2], to[2], p),
        jsUtils.lerp(from[3], to[3], p)
      ])
    },
    toRgba (c) {
      const r = `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`
      return r
    },
    getPower (appliance, indexes) {
      let power = 0
      for (let i = 0; i < indexes.length; i++) {
        power += appliance.state.relays[i].power
      }
      return Math.round(power)
    },
    async getAppliances () {
      const r = []
      for (const dataRow of this.data) {
        const row = []
        for (const d of dataRow) {
          const appliances = []
          let p = 0
          for (const appliance of d.appliances) {
            const a = await appliancesService.getById(appliance.id)
            overmindUtils.parseState(a)
            overmindUtils.parseConfig(a)
            a.powerRaw = this.getPower(a, appliance.indexes)
            a.power = overmindUtils.formatPower(a.powerRaw, true)
            p += a.powerRaw
            appliances.push(a)
          }
          const obj = {
            appliances: appliances,
            icons: d.icons,
            isBattery: d.isBattery,
            max: d.max,
            gradient: d.gradient,
            power: overmindUtils.formatPower(p),
            percent: d.max ? (100 / d.max * p) : null,
            color: d.color ? d.color : 'orange'
          }
          row.push(obj)
        }
        r.push(row)
      }
      this.appliances = r
    }
  },

  mounted () {
    this.getAppliances()
    this.interval = setInterval(() => this.getAppliances(), 2000)
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

.noFocus:focus::before {
  opacity: 0 !important;
}

.flip-card {
  perspective: 1000px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
}

.flip .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: fixed;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.flip-card-front {
}

.flip-card-back {
  transform: rotateY(180deg);
}
</style>
