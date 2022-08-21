<template>
<div class="text-center">
  <v-dialog v-model="dialogOpen" width="500">
    <v-card class="ma-0 pa-0">
      <v-card-title class="text-h6 accent mb-2">
        {{ app.name }}
      </v-card-title>

      <v-card-text class="mb-n2">
        <component v-if="component" v-bind:is="component" :item="item" :app="app"></component>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-text class="ma-0 mt-3 pa-0">
        <v-expansion-panels accordion hover class="ma-0 pa-0">
          <v-expansion-panel class="ma-0 pa-0">
            <v-expansion-panel-header class="ma-0">
                Zusatzinfos
            </v-expansion-panel-header>
            <v-expansion-panel-content class="ma-0 mt-2 pa-0">
              <v-row>
                <v-col class="ma-0 mr-1 pa-0">
                  <v-text-field disabled dense outlined hide-details="true" class="ma-0 my-3 pa-0" label="ID:" :value="app.id"></v-text-field>
                </v-col>
                <v-col class="ma-0 pa-0">
                  <v-text-field disabled dense outlined hide-details="true" class="ma-0 my-3 pa-0" label="IP:" :value="getIp(app)"></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col class="ma-0 mr-1 pa-0">
                  <v-text-field disabled dense outlined hide-details="true" class="ma-0 my-3 pa-0" label="Letztes Mal online:" :value="dateUtils.isoToShortDateLongTime(app.lastTimeOnline, $i18n.locale)"></v-text-field>
                </v-col>
                <v-col class="ma-0 pa-0">
                  <v-text-field disabled dense outlined hide-details="true" class="ma-0 my-3 pa-0" label="Letztes Setup:" :value="dateUtils.isoToShortDateLongTime(app.lastTimeSetup, $i18n.locale)"></v-text-field>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </v-dialog>
  </div>
</template>

<script lang="js">
import { singleton as dateUtils } from '@/utils/dateUtils'
import FloorplanPlugDialog from '@/components/FloorplanPlugDialog.vue'

export default {
  name: 'FloorplanDialogFactory',

  props: {
    item: {},
    app: {}
  },

  components: {
    FloorplanPlugDialog
  },

  data: () => ({
    dateUtils,
    dialogOpen: false,
    component: {},
    FloorplanPlugDialog
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    getIp (app) {
      if (app && app.config) {
        return app.config.address ? app.config.address : ''
      }
      return ''
    },
    show () {
      if (this.mapFqn()) {
        this.dialogOpen = true
      }
    },
    mapFqn () {
      // console.log(this.app.classFqn)
      switch (this.app.classFqn) {
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellySwitch1PMAppliance':
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyPlugAppliance':
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellySwitch25Appliance':
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyDimmerAppliance':
          this.component = FloorplanPlugDialog
          return true
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyDoorWindow2Appliance':
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyHTAppliance':
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyPlusHTAppliance':
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyMotionAppliance':
          this.component = null
          return true
      }
      return false
    }
  },

  mounted () {
    console.log('mounted')
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
.bold {
  font-weight: bold;
}
</style>
