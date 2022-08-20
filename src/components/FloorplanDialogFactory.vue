<template>
<div class="text-center">
  <v-dialog v-model="dialogOpen" width="500">
    <v-card>
      <v-card-title class="text-h6 accent mb-2">
        {{ app.name }}
      </v-card-title>

      <v-card-text class="mb-n2">
        <component v-if="component" v-bind:is="component" :item="item" :app="app"></component>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          block
          color="secondary"
          text
          @click="dialogOpen = false"
        >
          Schließen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  </div>
</template>

<script lang="js">
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
    dialogOpen: false,
    component: {},
    FloorplanPlugDialog
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    show () {
      if (this.mapFqn()) {
        this.dialogOpen = true
      }
    },
    mapFqn () {
      console.log(this.app.classFqn)
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
