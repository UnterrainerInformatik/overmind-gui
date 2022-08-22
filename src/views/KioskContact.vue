<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <Floorplan
        icon="meeting_room"
        :additionalAreas="areas"
        colorOn="rgba(280, 70, 0, 0.6)"
        colorMiddle="rgba(160, 160, 0, 0.8)"
        colorOff="rgba(60, 60, 255, 0.6)"
        colorError="rgba(255, 0, 0, 0.6)"
        colorGrey="rgba(60, 60, 60, 0.8)"
        colorTransparent="rgba(0, 0, 0, 0)"
        :classFqnFilter="[
          'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyDoorWindow2Appliance',
          'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyHTAppliance',
          'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyPlusHTAppliance'
        ]"
      >
      </Floorplan>
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import Floorplan from '@/components/floorplan/Floorplan.vue'

export default {
  name: 'kioskContact',

  components: {
    KioskLinkPanel,
    Floorplan
  },

  data: () => ({
    areas: [
    ]
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  mounted () {
    this.kioskMode(true)
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
