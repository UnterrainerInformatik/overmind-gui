<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <Floorplan
        icon="sensor_occupied"
        :displayEnhancedDialog="displayEnhancedDialog"
        :additionalAreas="areas"
        colorOn="rgba(120, 120, 0, 0.6)"
        colorOff="rgba(60, 60, 255, 0.4)"
        colorError="rgba(255, 0, 0, 0.3)"
        colorGrey="rgba(60, 60, 60, 0.6)"
        colorTransparent="rgba(0, 0, 0, 0)"
        :applianceTypeFilter="['OCCUPANCY_SENSOR']"
      >
      </Floorplan>
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>
      <v-divider></v-divider>
      <KioskTogglePanel :text="$t('page.kiosk.toggleDetails')" @handle-change="handleToggleDetailsChange">
      </KioskTogglePanel>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import KioskTogglePanel from '@/components/KioskTogglePanel.vue'
import Floorplan from '@/components/floorplan/Floorplan.vue'

export default {
  name: 'kioskPresence',

  components: {
    KioskLinkPanel,
    KioskTogglePanel,
    Floorplan
  },

  data: () => ({
    displayEnhancedDialog: false,
    areas: []
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    handleToggleDetailsChange (value) {
      this.displayEnhancedDialog = value
    },
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
