<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <Floorplan
        icon="vibration"
        :clickableMap="false"
        :additionalAreas="areas"
        colorOn="rgba(160, 160, 0, 0.6)"
        colorOff="rgba(60, 60, 255, 0.4)"
        colorError="rgba(255, 0, 0, 0.3)"
        colorGrey="rgba(60, 60, 60, 0.6)"
        colorTransparent="rgba(0, 0, 0, 0)"
        :classFqnFilter="[
          'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyMotionAppliance'
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
import Floorplan from '@/components/Floorplan.vue'

export default {
  name: 'kioskMovement',

  components: {
    KioskLinkPanel,
    Floorplan
  },

  data: () => ({
    areas: [
      {
        title: 'cellar-vestibule',
        appId: 0,
        iconPos: [195, 160],
        coords: [163, 150, 268, 149, 268, 224, 165, 225]
      },
      {
        title: 'cellar-stairs-up',
        appId: 0,
        iconPos: [160, 114],
        coords: [214, 148, 165, 146, 166, 56, 229, 57, 214, 106]
      },
      {
        title: '1st-stairs-down',
        appId: 0,
        iconPos: [660, 70],
        coords: [660, 109, 704, 108, 703, 18, 658, 18]
      }
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
