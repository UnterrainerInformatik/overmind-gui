<template>
  <KioskPanel
    class="noFocus"
    borderColor="secondary"
    :renderTitle="false"
    bgColor="black"
    min-width="350"
    max-width="350"
  >
    <template>
      <v-row v-for="(row, i) in appliances" :key="i">
        <v-col v-for="(app, j) in row" :key="j" class="ma-0 pa-0 pl-1">
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
                >
                  <v-row>
                    <v-col cols="1" v-for="(icon, g) in app.icons" :key="g">
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
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as overmindUtils } from '@/utils/overmindUtils'
import { singleton as jsUtils } from '@/utils/jsUtils'

export default {
  name: 'KioskPowerPanel',

  props: {
    data: { default: null }
  },

  components: {
    KioskPanel
  },

  data: () => ({
    jsUtils,
    overmindUtils,
    interval: null,
    appliances: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
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
            appliances.push(a)
            p += this.getPower(a, appliance.indexes)
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

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
