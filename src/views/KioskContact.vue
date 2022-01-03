<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <Floorplan
        icon="meeting_room"
        :clickableMap="false"
        :additionalAreas="areas"
        :strongAreaColors="true"
        :classFqnFilter="[
          'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyDoorWindow2Appliance'
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
