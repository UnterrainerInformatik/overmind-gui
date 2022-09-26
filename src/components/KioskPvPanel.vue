<template>
  <KioskPanel
    class="noFocus"
    borderColor="secondary"
    bgColor="black"
    min-width="270"
    max-width="270"
    v-if="appliance"
  >
    <template v-slot:title>
      <v-row>
        <v-col>
          {{ $t('page.kiosk.solarPower') }}
        </v-col>
        <v-col class="text-right">
          <v-icon>solar_power</v-icon>
        </v-col>
      </v-row>
    </template>
    <template>
      <v-card>
        <v-progress-linear striped height="70" class="bar" color="orange" :value="value">{{ value }} {{ $t('page.kiosk.watts') }}</v-progress-linear>
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
    appId: {},
    wp: { default: 800 }
  },

  components: {
    KioskPanel
  },

  data: () => ({
    interval: null,
    appliance: null
  }),

  computed: {
    value () {
      return this.wp / 100 * this.appliance.state.relays[0].power
    }
  },

  watch: {
  },

  methods: {
    async getAppliance () {
      const result = await appliancesService.getById(this.appId)
      overmindUtils.parseState(result)
      overmindUtils.parseConfig(result)
      this.appliance = result
    }
  },

  mounted () {
    this.getAppliance()
    this.interval = setInterval(() => this.getAppliance(), 2000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
