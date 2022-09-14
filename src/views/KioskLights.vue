<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <Floorplan
        icon="lightbulb"
        :displayEnhancedDialog="displayEnhancedDialog"
        :additionalAreas="areas"
        colorOn="rgba(120, 120, 0, 0.6)"
        colorOff="rgba(60, 60, 255, 0.4)"
        colorError="rgba(255, 0, 0, 0.3)"
        colorGrey="rgba(60, 60, 60, 0.6)"
        colorTransparent="rgba(0, 0, 0, 0)"
        :applianceTypeFilter="['LIGHT']"
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
  name: 'kioskLights',

  components: {
    KioskLinkPanel,
    KioskTogglePanel,
    Floorplan
  },

  data: () => ({
    displayEnhancedDialog: false,
    areas: [
      {
        title: '2nd-bath-mirror',
        appId: 0,
        iconPos: [1120, 90],
        coords: [1120, 159, 1166, 159, 1166, 91, 1120, 91]
      },
      {
        title: '2nd-closet',
        appId: 0,
        iconPos: [1050, 290],
        coords: [1016, 288, 1117, 289, 1117, 401, 1017, 401]
      }
    ]
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
