<template>
<div class="text-center">
  <v-dialog v-model="dialogOpen" width="500">
    <v-card class="ma-0 pa-0">
      <v-card-title class="text-h6 accent mb-5">
        {{ app.name }}
        <v-spacer></v-spacer>
        <v-icon @click="showAdditionalInfo === 0 ? showAdditionalInfo = false : showAdditionalInfo = 0">help_center</v-icon>
      </v-card-title>

      <v-card-text>
        <component v-if="component" v-bind:is="component" :item="item" :app="app"></component>
      </v-card-text>

      <v-card-text class="ma-0 pa-0">
        <v-expansion-panels accordion hover class="ma-0 pa-0" v-if="showAdditionalInfo === 0" v-model="showAdditionalInfo">
          <v-expansion-panel class="ma-0 pa-0">
            <v-expansion-panel-header class="ma-0 accent">
                Zusatzinfos
            </v-expansion-panel-header>
            <v-expansion-panel-content class="ma-0 mt-4 pa-0">
              <v-row>
                <v-col class="ma-0 mr-1 pa-0">
                  <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="ID:" :value="app.id"></v-text-field>
                </v-col>
                <v-col class="ma-0 pa-0">
                  <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Adresse:" :value="getIp(app)"></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col class="ma-0 mr-1 pa-0">
                  <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Letztes Mal online:" :value="dateUtils.isoToShortDateLongTime(app.lastTimeOnline, $i18n.locale)"></v-text-field>
                </v-col>
                <v-col class="ma-0 pa-0">
                  <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Letztes Setup:" :value="dateUtils.isoToShortDateLongTime(app.lastTimeSetup, $i18n.locale)"></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col class="ma-0 mr-1 pa-0">
                  <v-text-field v-if="getTemperature(app)" readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Temperatur:" :value="getTemperature(app)"></v-text-field>
                </v-col>
                <v-col class="ma-0 pa-0">
                  <v-text-field v-if="getLastEdge(app)" readonly dense outlined hide-details="true" class="ma-0 my-2 pa-0" label="Letztes Mal An/Aus:" :value="getLastEdge(app)"></v-text-field>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
        <v-expansion-panels accordion hover class="ma-0 pa-0" v-model="showConfig" v-if="app.config && showAdditionalInfo === 0">
          <v-expansion-panel class="ma-0 pa-0">
            <v-expansion-panel-header class="ma-0 primary">
                Konfiguration
            </v-expansion-panel-header>
            <v-expansion-panel-content class="ma-0 mt-2 pa-0">
              <v-textarea
                disabled
                :rows="configRows"
                type="text"
                outlined
                dense
                v-model="config"
              >
              </v-textarea>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
        <v-expansion-panels accordion hover class="ma-0 pa-0" v-model="showState" v-if="app.state && showAdditionalInfo === 0">
          <v-expansion-panel class="ma-0 pa-0">
            <v-expansion-panel-header class="ma-0 primary">
                Zustand
            </v-expansion-panel-header>
            <v-expansion-panel-content class="ma-0 mt-2 pa-0">
              <v-textarea
                disabled
                :rows="stateRows"
                type="text"
                outlined
                dense
                v-model="state"
              >
              </v-textarea>
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
import FloorplanPlugDialog from '@/components/floorplan/dialogs/FloorplanPlugDialog.vue'
import FloorplanHTDialog from '@/components/floorplan/dialogs/FloorplanHTDialog.vue'
import FloorplanContactDialog from '@/components/floorplan/dialogs/FloorplanContactDialog.vue'
import FloorplanMotionDialog from '@/components/floorplan/dialogs/FloorplanMotionDialog.vue'

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
    showAdditionalInfo: false,
    showConfig: false,
    showState: false,
    dialogOpen: false,
    component: {},
    FloorplanPlugDialog
  }),

  computed: {
    config: {
      get: function () {
        if (!this.app || !this.app.config) {
          return ''
        }
        return JSON.stringify(this.app.config, undefined, 2)
      }
    },
    state: {
      get: function () {
        if (!this.app || !this.app.state) {
          return ''
        }
        return JSON.stringify(this.app.state, undefined, 2)
      }
    },
    configRows: {
      get: function () {
        return this.config.split(/\r\n|\r|\n/).length
      }
    },
    stateRows: {
      get: function () {
        return this.state.split(/\r\n|\r|\n/).length
      }
    }
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
    getTemperature (app) {
      if (app && app.state && app.state.temperatures && app.state.temperatures[0] !== undefined && app.state.temperatures[0].temperature !== undefined) {
        return app.state.temperatures[0].temperature + ' °C'
      }
      return null
    },
    getLastEdge (app) {
      if (app && app.state && app.state.relays && app.state.relays[0] !== undefined && app.state.relays[0].lastEdgeOn !== undefined) {
        return dateUtils.dateToShortDateLongTime(new Date(app.state.relays[0].lastEdgeOn), this.$i18n.locale)
      }
      return null
    },
    show () {
      if (this.mapFqn()) {
        this.showAdditionalInfo = false
        this.showConfig = false
        this.showState = false
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
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyHTAppliance':
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyPlusHTAppliance':
          this.component = FloorplanHTDialog
          return true
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyDoorWindow2Appliance':
          this.component = FloorplanContactDialog
          return true
        case 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyMotionAppliance':
          this.component = FloorplanMotionDialog
          return true
      }
      this.component = null
      return true
    }
  },

  mounted () {
    console.log('mounted')
  }
}
</script>

<style lang="scss">
@import '../../index.scss';

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
