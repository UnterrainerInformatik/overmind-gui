<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>
      <div style="position: relative;" :width="imgWidth" :height="imgHeight">
        <canvas class="noFocus" ref="canvas" :width="imgWidth" :height="imgHeight"
          style="position:absolute; pointer-events:none;"
          >Your browser does not support the HTML5 canvas tag.
        </canvas>
        <img :width="imgWidth" :height="imgHeight"
          class="noFocus"
          :src="require('@/assets/plan.png')"
          alt="Map of the building"
          usemap="#image-map"
        />
        <map name="image-map">
          <area
            class="noFocus"
            v-for="(area, i) in areas"
            :key="i"
            v-on:click="areaClicked($event, area)"
            :alt="area.title"
            :title="area.title"
            href="#"
            :coords="area.coords.map((e) => e * (this.imgWidth / this.fullImgWidth)).toString()"
            shape="poly"
          />
        </map>
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
  name: 'kioskOverview',

  components: {
    KioskLinkPanel
  },

  data: () => ({
    areas: [
      {
        title: '2nd-steven',
        appId: 44,
        coords: [870, 238, 1011, 238, 1011, 401, 870, 400]
      },
      {
        title: 'cellar-technical',
        appId: 96,
        coords: [17, 57, 160, 56, 161, 224, 17, 225]
      },
      {
        title: 'cellar-vestibule',
        appId: 0,
        coords: [166, 148, 268, 149, 268, 223, 166, 224]
      },
      {
        title: 'cellar-stairs',
        appId: 0,
        coords: [165, 56, 267, 57, 267, 146, 164, 145]
      },
      {
        title: 'cellar-workshop',
        appId: 102,
        coords: [278, 57, 409, 56, 409, 223, 277, 224]
      },
      {
        title: 'cellar-main-room-computer',
        appId: 1,
        index: 1,
        coords: [17, 234, 231, 234, 229, 399, 17, 399]
      },
      {
        title: 'cellar-main-room-sewing',
        appId: 1,
        index: 0,
        coords: [410, 235, 410, 399, 231, 400, 233, 233]
      },
      {
        title: '1st-wardrobe',
        appId: 94,
        coords: [475, 17, 560, 17, 559, 107, 475, 107]
      },
      {
        title: '1st-toilet',
        appId: 95,
        coords: [564, 18, 606, 18, 607, 108, 564, 108]
      },
      {
        title: '1st-stairs',
        appId: 108,
        coords: [610, 17, 704, 17, 703, 108, 610, 109]
      },
      {
        title: '1st-playroom',
        appId: 43,
        coords: [714, 17, 832, 17, 832, 169, 714, 169]
      },
      {
        title: '1st-vestibule-entrance',
        appId: 107,
        coords: [476, 111, 569, 111, 569, 170, 476, 170]
      },
      {
        title: '1st-vestibule-playroom',
        appId: 106,
        coords: [702, 111, 702, 169, 572, 170, 572, 110]
      },
      {
        title: '1st-main-livingroom',
        appId: 32,
        index: 1,
        coords: [476, 202, 654, 202, 654, 328, 476, 327]
      },
      {
        title: '1st-main-tv-cabinet',
        appId: 48,
        coords: [476, 178, 653, 177, 653, 199, 476, 199]
      },
      {
        title: '1st-main-diningroom',
        appId: 32,
        index: 0,
        coords: [748, 207, 766, 207, 768, 327, 657, 327, 657, 180, 748, 179]
      },
      {
        title: '1st-kitchen-sink',
        appId: 58,
        coords: [751, 178, 831, 178, 832, 204, 751, 204]
      },
      {
        title: '1st-kitchen',
        appId: 42,
        coords: [769, 207, 832, 206, 832, 328, 770, 328]
      },
      {
        title: '1st-patio-left',
        appId: 33,
        index: 0,
        coords: [655, 345, 805, 345, 805, 463, 654, 462]
      },
      {
        title: '1st-patio-right',
        appId: 33,
        index: 1,
        coords: [501, 345, 652, 345, 652, 461, 502, 461]
      },
      {
        title: '2nd-stairs',
        appId: 108,
        coords: [1016, 64, 1117, 64, 1117, 162, 1017, 163]
      },
      {
        title: '2nd-vestibule',
        appId: 103,
        coords: [1017, 167, 1118, 167, 1118, 286, 1018, 285]
      },
      {
        title: '2nd-bath',
        appId: 40,
        coords: [1122, 64, 1256, 64, 1257, 229, 1123, 227]
      },
      {
        title: '2nd-bedroom',
        appId: 90,
        coords: [1122, 238, 1256, 238, 1257, 400, 1123, 400]
      },
      {
        title: '2nd-closet',
        appId: 0,
        coords: [1016, 288, 1117, 289, 1117, 401, 1017, 401]
      },
      {
        title: '2nd-alex',
        appId: 41,
        coords: [870, 63, 1011, 63, 1012, 231, 870, 230]
      }
    ],
    ctx: null,
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
    imgHeight: 363
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    areaClicked (e, area) {
      e.preventDefault()
      const app = this.appMap.get(area.appId)
      if (!app) {
        return
      }
      const actorPath = this.getActorPathOf(app, area.index)
      let st = app.mystate
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
    redraw () {
      const scale = this.imgWidth / this.fullImgWidth
      this.ctx.clearRect(0, 0, this.imgWidth, this.imgHeight)
      for (const area of this.areas) {
        this.ctx.beginPath()
        this.ctx.moveTo(area.coords[0] * scale, area.coords[1] * scale)
        for (let item = 2; item < area.coords.length - 1; item += 2) {
          this.ctx.lineTo(area.coords[item] * scale, area.coords[item + 1] * scale)
        }
        this.ctx.closePath()
        const app = this.appMap.get(area.appId)
        this.setMyStateFor(app, area.index)
        if (!app) {
          this.ctx.fillStyle = this.colorTransparent
        } else {
          let st = app.mystate
          if (Array.isArray(st)) {
            st = st[area.index]
          }
          switch (st) {
            case 'none':
              this.ctx.fillStyle = this.colorTransparent
              break
            case 'on':
              this.ctx.fillStyle = this.colorOn
              break
            case 'off':
              this.ctx.fillStyle = this.colorOff
              break
            case 'error':
              this.ctx.fillStyle = this.colorError
          }
        }
        this.ctx.fill()
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
        this.redraw()
        this.loading = false
      })
    },
    setMyStateFor (item, index) {
      if (item === undefined) {
        return
      }

      switch (item.type) {
        case 'PLUG':
        case 'RELAY':
        case 'DIMMER':
        case 'BULB_RGB':
          if (!item || !item.state || !item.state.relays || !item.state.relays[0] || !item.state.relays[0].state) {
            item.mystate = 'error'
            return
          }
          if (item.state.relays[0].state.toLowerCase() === 'on') {
            item.mystate = 'on'
            return
          }
          item.mystate = 'off'
          return
        case 'RELAY_DUAL':
          if (!item || !item.state || !item.state.relays || !item.state.relays[0] || !item.state.relays[1] || !item.state.relays[0].state || !item.state.relays[1].state) {
            item.mystate = 'error'
            return
          }
          if (item.state.relays[index].state.toLowerCase() === 'on') {
            if (item.mystate === undefined) {
              item.mystate = []
            }
            item.mystate[index] = 'on'
            return
          }
          if (item.state.relays[index].state.toLowerCase() !== 'on') {
            if (item.mystate === undefined) {
              item.mystate = []
            }
            item.mystate[index] = 'off'
            return
          }
          item.mystate = 'error'
          return
      }
      item.mystate = 'none'
    },
    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  mounted () {
    this.kioskMode(true)
    const canvas = this.$refs.canvas
    this.ctx = canvas.getContext('2d')
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
