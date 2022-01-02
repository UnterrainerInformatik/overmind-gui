<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>
      <Floorplan icon="power" :additionalAreas="areas" :applianceTypeFilter="['PLUG']">
      </Floorplan>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import Floorplan from '@/components/Floorplan.vue'

export default {
  name: 'kioskPlugs',

  components: {
    KioskLinkPanel,
    Floorplan
  },

  data: () => ({
    areas: [
      {
        title: 'cellar-computer',
        appId: 0,
        iconPos: [90, 230]
      },
      {
        title: 'cellar-technical-room',
        appId: 0,
        iconPos: [115, 150]
      },
      {
        title: 'cellar-servers',
        appId: 0,
        iconPos: [10, 185]
      },
      {
        title: 'cellar-washingmachine-left',
        appId: 0,
        iconPos: [10, 125]
      },
      {
        title: 'cellar-washingmachine-right',
        appId: 0,
        iconPos: [56, 125]
      },
      {
        title: 'cellar-vestibule',
        appId: 0,
        iconPos: [230, 185]
      },
      {
        title: 'cellar-workshop-fridge',
        appId: 0,
        iconPos: [270, 109]
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
        title: '1st-patio-left',
        appId: 0,
        iconPos: [573, 335]
      },
      {
        title: '1st-patio-right',
        appId: 0,
        iconPos: [688, 335]
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
