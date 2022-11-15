<template>
  <KioskPanel
    class="noFocus"
    borderColor="secondary"
    bgColor="black"
    min-width="270"
    max-width="270"
  >
    <template v-slot:title>
      <v-row>
        <v-col>
          {{ $t('page.kiosk.power') }}
        </v-col>
        <v-col class="text-right">
          <v-icon>electrical_services</v-icon>
        </v-col>
      </v-row>
    </template>
    <template>
      <v-card class="ma-0 mb-1 pa-1 px-0 text-center" v-if="mainAppliance">
        <v-row
          ><v-col cols="1">
            <v-icon>electric_bolt</v-icon>
          </v-col>
          <v-col>
            {{
              overmindUtils.formatPower(
                getPower(this.mainAppliance, mainIndexes, true)
              )
            }}
          </v-col>
        </v-row>
      </v-card>
      <v-card v-if="pvAppliance">
        <v-progress-linear
          striped
          height="32"
          class="bar ma-0 mb-1 text-center"
          color="orange darken-3"
          :value="pvValue"
        >
          <v-row
            ><v-col cols="1">
              <v-icon>solar_power</v-icon>
            </v-col>
            <v-col>
              {{
                overmindUtils.formatPower(
                  getPower(this.pvAppliance, pvIndexes),
                  true
                )
              }}
            </v-col>
          </v-row>
        </v-progress-linear>
      </v-card>
      <v-card class="ma-0 mb-1 pa-1 px-0 text-center" v-if="heatAppliance">
        <v-row
          ><v-col cols="1">
            <v-icon>local_fire_department</v-icon>
          </v-col>
          <v-col>
            {{
              overmindUtils.formatPower(
                getPower(this.heatAppliance, heatIndexes, true)
              )
            }}
          </v-col>
        </v-row>
      </v-card>
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

export default {
  name: 'KioskPvPanel',

  props: {
    pvId: {},
    pvIndexes: { default: [] },
    mainId: {},
    mainIndexes: { default: [] },
    heatId: {},
    heatIndexes: { default: [] },
    wp: { default: 800 }
  },

  components: {
    KioskPanel
  },

  data: () => ({
    overmindUtils,
    interval: null,
    pvAppliance: null,
    mainAppliance: null,
    heatAppliance: null
  }),

  computed: {
    pvValue () {
      return 100 / this.wp * this.getPower(this.pvAppliance, this.pvIndexes)
    }
  },

  watch: {
  },

  methods: {
    getPower (appliance, indexes) {
      let power = 0
      for (let i = 0; i < indexes.length; i++) {
        power += appliance.state.relays[i].power
      }
      return Math.round(power)
    },
    async getAppliances () {
      let result = await appliancesService.getById(this.pvId)
      overmindUtils.parseState(result)
      overmindUtils.parseConfig(result)
      this.pvAppliance = result
      result = await appliancesService.getById(this.mainId)
      overmindUtils.parseState(result)
      overmindUtils.parseConfig(result)
      this.mainAppliance = result
      result = await appliancesService.getById(this.heatId)
      overmindUtils.parseState(result)
      overmindUtils.parseConfig(result)
      this.heatAppliance = result
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
