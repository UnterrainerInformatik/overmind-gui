<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>
      <Floorplan icon="lightbulb" :additionalAreas="areas" :applianceTypeFilter="['LIGHT']">
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
  name: 'kioskLights',

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
        coords: [166, 148, 268, 149, 268, 223, 166, 224]
      },
      {
        title: 'cellar-stairs',
        appId: 0,
        iconPos: [220, 82],
        coords: [165, 56, 267, 57, 267, 146, 164, 145]
      },
      {
        title: '2nd-bath-mirror',
        appId: 0,
        iconPos: [1120, 90],
        coords: [1120, 159, 1166, 159, 1166, 91, 1120, 91]
      },
      {
        title: '2nd-stairs',
        appId: 108,
        iconPos: [1070, 85],
        coords: [1016, 64, 1117, 64, 1117, 162, 1017, 163]
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
