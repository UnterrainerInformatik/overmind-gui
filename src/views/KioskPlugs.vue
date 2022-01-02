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
