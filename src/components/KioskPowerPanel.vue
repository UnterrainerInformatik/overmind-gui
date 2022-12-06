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
        <v-col v-for="(app, j) in row" :key="j" class="ma-0 pa-1">
          <v-card v-if="app">
            <v-progress-linear
              striped
              height="32"
              class="bar ma-0 mb-1 text-center"
              :color="
                (app.gradient && app.percent
                  ? toRgba([
                      255,
                      jsUtils.lerp(180, 0, app.percent / 100),
                      0,
                      jsUtils.lerp(0.7, 1, app.percent / 100)
                    ])
                  : app.color) + ' darken-3'
              "
              :value="app.percent ? app.percent : undefined"
            >
              <v-row
                ><v-col cols="1" v-for="(icon, g) in app.icons" :key="g">
                  <v-icon>{{ icon }}</v-icon>
                </v-col>
                <v-col>{{ app.power }}</v-col>
              </v-row>
            </v-progress-linear>
          </v-card>
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
    toRgba (c) {
      console.log({ c })
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
            max: d.max,
            gradient: d.gradient ? d.gradient : false,
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
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
