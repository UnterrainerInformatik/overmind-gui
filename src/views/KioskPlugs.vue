<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>
      <div style="position: relative" :width="imgWidth" :height="imgHeight">
        <v-avatar
          size="36"
          v-for="(area, i) in withPlug()"
          :key="i"
          :color="getColor(area)"
          v-on:click="areaClicked($event, area)"
          class="noFocus"
          :style="`position: absolute; top: ${
            area.iconPos[1] * (imgWidth / fullImgWidth)
          }px; left: ${area.iconPos[0] * (imgWidth / fullImgWidth)}px`"
        >
          <v-icon size="20" :color="getColor(area) == 'transparent' ? 'grey' : 'white'">power</v-icon>
        </v-avatar>
        <img
          :width="imgWidth"
          :height="imgHeight"
          class="noFocus"
          :src="require('@/assets/plan.png')"
          alt="Map of the building"
        />
      </div>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as overmindUtils } from '@/utils/overmindUtils'

export default {
  name: 'kioskPlugs',

  components: {
    KioskLinkPanel
  },

  data: () => ({
    areas: [
      {
        title: 'Cellar Workshop - Plug+Button Charging Device',
        appId: 45,
        iconPos: [270, 75]
      },
      {
        title: 'Kitchen Plug+Button Toaster',
        appId: 46,
        iconPos: [750, 175]
      },
      {
        title: 'Cellar Workshop Plug+Button Scooter Charger',
        appId: 47,
        iconPos: [316, 75]
      },
      {
        title: 'Living Room Plug+Button Light Cupboard',
        appId: 48,
        iconPos: [520, 175]
      }
    ],
    colorOn: 'rgba(160, 160, 0, 0.1)',
    colorOff: 'rgba(60, 60, 255, 0.1)',
    colorError: 'rgba(255, 0, 0, 0.1)',
    colorTransparent: 'rgba(0, 0, 0, 0)',
    appMap: new Map(),
    appliances: [],
    loading: true,
    fullImgWidth: 1276,
    fullImgHeight: 464,
    imgWidth: 1000,
    imgHeight: 363,
    colorOverrides: []
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    withPlug () {
      return this.areas.filter(a => a.iconPos && a.iconPos[0] && a.iconPos[1])
    },
    areaClicked (event, area) {
      console.log('clicked')
      event.preventDefault()
      if (area.appId === 0) {
        return
      }
      const app = this.appMap.get(area.appId)
      if (!app) {
        return
      }
      if (this.colorOverrides.find((e) => e.id === area.appId && e.index === area.index)) {
        return
      }
      this.colorOverrides.push({ id: area.appId, index: area.index })
      this.redraw(false)
      const actorPath = this.getActorPathOf(app, area.index)
      let st = app.onOffState
      if (Array.isArray(st)) {
        st = st[area.index]
      }
      if (st === 'on') {
        appliancesService.turnOff(app.id, actorPath)
      }
      if (st === 'off') {
        appliancesService.turnOn(app.id, actorPath)
      }
    },
    getActorPathOf (app, index) {
      switch (app.type) {
        case 'PLUG':
        case 'RELAY':
          return 'relay'
        case 'DIMMER':
        case 'BULB_RGB':
          return 'light'
        case 'RELAY_DUAL':
          return 'relay' + (index + 1)
      }
    },
    redraw (reset) {
      if (reset) {
        this.colorOverrides = []
      }
      for (const area of this.areas) {
        const app = this.appMap.get(area.appId)
        overmindUtils.addOnOffStateTo(app, area.index)
      }
    },
    async getAppliances (showLoadingProgress) {
      this.loading = showLoadingProgress

      const appliances = []
      return appliancesService.getList().then((response) => {
        response.entries.forEach(element => {
          overmindUtils.parseState(element)
          overmindUtils.parseConfig(element)
          appliances.push(element)
        })
      }).then(() => {
        appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
        this.appliances = appliances
        this.appMap = new Map()
        for (const element of this.appliances) {
          this.appMap.set(element.id, element)
        }
        this.redraw(true)
        this.loading = false
      })
    },
    getColor (area) {
      const app = this.appMap.get(area.appId)
      if (!app) {
        return 'transparent'
      }
      const override = this.colorOverrides.find((e) => e.id === area.appId && e.index === area.index)
      if (override) {
        if (Array.isArray(override)) {
          return override[area.index].color
        }
        return 'grey'
      }
      let st = app.onOffState
      if (Array.isArray(st)) {
        st = st[area.index]
      }
      if (st === 'on') {
        return 'on'
      }
      if (st === 'off') {
        return 'off'
      }
      return 'transparent'
    },
    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  mounted () {
    this.kioskMode(true)
    this.getAppliances(true)
    this.interval = setInterval(() => this.getAppliances(false), 3000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
