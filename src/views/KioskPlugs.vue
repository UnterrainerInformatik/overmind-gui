<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <Floorplan
        icon="power"
        :displayEnhancedDialog="displayEnhancedDialog"
        :clickableMap="false"
        :additionalAreas="areas"
        colorOn="rgba(160, 160, 0, 0.8)"
        colorOff="rgba(60, 60, 255, 0.6)"
        colorError="rgba(255, 0, 0, 0.6)"
        colorGrey="rgba(60, 60, 60, 0.8)"
        colorTransparent="rgba(0, 0, 0, 0)"
        :applianceTypeFilter="['PLUG']"
        :icons="[
          {
            icon: 'electric_bolt',
            sizeMult: 1,
            x: 65,
            y: 420
          },
          {
            icon: 'solar_power',
            sizeMult: 1,
            x: 482,
            y: 430
          },
          {
            icon: 'solar_power',
            sizeMult: 1,
            x: 720,
            y: 365
          },
          {
            icon: 'fireplace',
            sizeMult: 1,
            x: 70,
            y: 5
          }
        ]"
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
  name: 'kioskPlugs',

  components: {
    KioskLinkPanel,
    KioskTogglePanel,
    Floorplan
  },

  data: () => ({
    displayEnhancedDialog: false,
    areas: [
      {
        title: 'cellar-computer',
        appId: 0,
        iconPos: [90, 230]
      },
      {
        title: '1st-playroom-window',
        appId: 0,
        iconPos: [790, 126]
      },
      {
        title: '1st-living-patio-right',
        appId: 0,
        iconPos: [582, 282]
      },
      {
        title: '2nd-bath-sink-left-upper',
        appId: 0,
        iconPos: [1118, 125]
      },
      {
        title: '2nd-bath-sink-left-lower',
        appId: 0,
        iconPos: [1158, 125]
      },
      {
        title: '2nd-bath-sink-right',
        appId: 0,
        iconPos: [1118, 75]
      },
      {
        title: '2nd-bath-entrance-right',
        appId: 0,
        iconPos: [1158, 185]
      },
      {
        title: '2nd-vestibule',
        appId: 0,
        iconPos: [1015, 205]
      },
      {
        title: '2nd-bed-left',
        appId: 0,
        iconPos: [1215, 255]
      },
      {
        title: '2nd-bed-right',
        appId: 0,
        iconPos: [1215, 330]
      },
      {
        title: '2nd-bedroom-entrance-lower-right',
        appId: 0,
        iconPos: [1120, 253]
      },
      {
        title: '2nd-bedroom-entrance-upper-left',
        appId: 0,
        iconPos: [1120, 298]
      },
      {
        title: '2nd-wardrobe',
        appId: 0,
        iconPos: [1070, 295]
      },
      {
        title: '2nd-alex-entrance',
        appId: 0,
        iconPos: [965, 145]
      },
      {
        title: '2nd-alex-bed',
        appId: 0,
        iconPos: [920, 186]
      },
      {
        title: '2nd-alex',
        appId: 0,
        iconPos: [935, 60]
      },
      {
        title: '2nd-steven-bed',
        appId: 0,
        iconPos: [920, 235]
      },
      {
        title: '2nd-steven-entrance',
        appId: 0,
        iconPos: [965, 272]
      },
      {
        title: '2nd-steven',
        appId: 0,
        iconPos: [965, 320]
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
