<template>
  <span>
    <v-row
      v-resize="reCompose"
      ref="backgroundMeasurement"
      class="ma-0 pa-0"
    ></v-row>
    <div style="position: relative; width: 100vw">
      <canvas
        class="noFocus"
        ref="canvas"
        :width="imgWidth"
        :height="imgHeight"
        style="position: absolute; pointer-events: none"
        >Your browser does not support the HTML5 canvas tag.
      </canvas>
      <span v-if="loaded">
        <span v-for="(area, i) in getAreasWithIcon()" :key="i">
          <BatteryIndicator
            v-if="
              !isError(area) && displayBattery(area) && appMap.get(area.appId)
            "
            :size="avatarBaseSize * (imgWidth / fullImgWidth)"
            :level="
              Math.round(
                appMap.get(area.appId).state.batteries[0].batteryLevel * 100
              )
            "
            v-on:click="areaClicked($event, area, true)"
            :style="
              (clickableIcons ? 'cursor: pointer !important; ' : 'cursor: default !important; ') +
              `position: absolute; top: ${
                area.iconPos[1] * (imgWidth / fullImgWidth)
              }px; left: ${area.iconPos[0] * (imgWidth / fullImgWidth)}px`
            "
          ></BatteryIndicator>
          <v-avatar
            v-if="
              (!isError(area) || !appMap.get(area.appId)) &&
              !displayBattery(area)
            "
            :size="avatarBaseSize * (imgWidth / fullImgWidth)"
            :color="
              getColor(area) == 'transparent' ? 'grey darken-3' : getColor(area)
            "
            v-on:click="areaClicked($event, area, true)"
            class="noFocus"
            :style="
              (clickableIcons ? 'cursor: pointer !important; ' : 'cursor: default !important; ') +
              `position: absolute; top: ${
                area.iconPos[1] * (imgWidth / fullImgWidth)
              }px; left: ${area.iconPos[0] * (imgWidth / fullImgWidth)}px`
            "
          >
            <v-icon
              size="20"
              v-if="!displayWatts(area)"
              :color="getColor(area) == 'transparent' ? 'grey' : 'white'"
              >{{ icon }}</v-icon
            >
            <span class="small" v-if="displayWatts(area)">{{
              formatPower(getPowerOf(area))
            }}</span>
          </v-avatar>
          <v-avatar
            v-if="isError(area) && appMap.get(area.appId)"
            :size="avatarBaseSize * (imgWidth / fullImgWidth)"
            color="red"
            class="noFocus"
            v-on:click="areaClicked($event, area, true)"
            :style="
              (clickableIcons ? 'cursor: pointer !important; ' : 'cursor: default !important; ') +
              `position: absolute; top: ${
                area.iconPos[1] * (imgWidth / fullImgWidth)
              }px; left: ${area.iconPos[0] * (imgWidth / fullImgWidth)}px`
            "
          >
            <v-icon size="20" color="white">bolt</v-icon>
          </v-avatar>
        </span>
      </span>
      <img
        :width="imgWidth"
        :height="imgHeight"
        class="noFocus"
        :src="$store.state.gui.floorplan"
        alt="Map of the building"
        usemap="#image-map"
      />
      <map name="image-map" v-if="loaded">
        <area
          class="noFocus"
          :style="clickableMap ? '' : 'cursor: default !important; '"
          v-for="(area, i) in getAreasWithCoords()"
          :key="i"
          v-on:click="areaClicked($event, area, false)"
          :alt="area.title"
          :title="area.title"
          href="#"
          :coords="
            area.coords.map((e) => e * (imgWidth / fullImgWidth)).toString()
          "
          shape="poly"
        />
      </map>
    </div>
  </span>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import BatteryIndicator from '@/components/BatteryIndicator.vue'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as overmindUtils } from '@/utils/overmindUtils'

export default {
  name: 'Floorplan',

  components: {
    BatteryIndicator
  },

  props: {
    icon: {},
    additionalAreas: {},
    applianceTypeFilter: [],
    classFqnFilter: [],
    clickableMap: { default: true },
    clickableIcons: { default: true },
    colorOn: {},
    colorOff: {},
    colorMiddle: {},
    colorError: {},
    colorGrey: {},
    colorTransparent: {}
  },

  data: () => ({
    areas: [],
    loaded: false,
    ctx: null,
    appMap: undefined,
    appliances: [],
    loading: true,
    fullImgWidth: 1276,
    fullImgHeight: 464,
    imgWidth: 1000,
    imgHeight: 363,
    avatarBaseSize: 46,
    readWidth: undefined,
    readHeight: undefined,
    imgWidthOrHeightDebounce: false,
    colorOverrides: []
  }),

  computed: {
  },

  watch: {
    imgWidth: {
      handler: function () {
        if (!this.imgWidthOrHeightDebounce) {
          this.imgWidthOrHeightDebounce = true
          setTimeout(() => this.reCompose(), 10)
        }
      },
      deep: true
    },
    imgHeight: {
      handler: function () {
        if (!this.imgWidthOrHeightDebounce) {
          this.imgWidthOrHeightDebounce = true
          setTimeout(() => this.reCompose(), 10)
        }
      },
      deep: true
    }
  },

  methods: {
    reCompose () {
      this.imgWidthOrHeightDebounce = false
      if (!this.$refs.backgroundMeasurement) {
        return
      }
      this.imgWidth = this.$refs.backgroundMeasurement.clientWidth
      this.imgWidth = this.imgWidth - this.imgWidth / 30
      this.imgHeight = this.fullImgHeight * (this.imgWidth / this.fullImgWidth)
      const canvas = this.$refs.canvas
      this.ctx = canvas.getContext('2d')
      this.redraw(false)
    },
    displayBattery (area) {
      const app = this.appMap.get(area.appId)
      if (app === undefined) {
        return false
      }
      return app.batteryDriven
    },
    displayWatts (area) {
      return this.isOn(area) && this.getPowerOf(area, area.index) !== undefined
    },
    formatPower (p) {
      return overmindUtils.formatPower(p)
    },
    getPowerOf (area) {
      const app = this.appMap.get(area.appId)
      if (app === undefined) {
        return undefined
      }
      return overmindUtils.getPowerOf(app, area.index)
    },
    getAreasWithIcon () {
      return this.areas.filter(a => a.iconPos && a.iconPos[0] && a.iconPos[1])
    },
    getAreasWithCoords () {
      return this.areas.filter(a => this.hasCoords(a))
    },
    hasCoords (area) {
      return area.coords
    },
    areaClicked (event, area, iconClicked) {
      event.preventDefault()
      if (area.appId === 0) {
        return
      }
      const app = this.appMap.get(area.appId)
      if (!app) {
        return
      }
      if ((!iconClicked && !this.clickableMap) || (iconClicked && !this.clickableIcons)) {
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
      const scale = this.imgWidth / this.fullImgWidth
      this.ctx.clearRect(0, 0, this.imgWidth, this.imgHeight)
      for (const area of this.areas) {
        const item = this.appMap.get(area.appId)
        overmindUtils.addOnOffStateTo(item, area.index)
      }
      this.loaded = true
      for (const area of this.getAreasWithCoords()) {
        this.ctx.beginPath()
        this.ctx.moveTo(area.coords[0] * scale, area.coords[1] * scale)
        for (let item = 2; item < area.coords.length - 1; item += 2) {
          this.ctx.lineTo(area.coords[item] * scale, area.coords[item + 1] * scale)
        }
        this.ctx.closePath()
        const app = this.appMap.get(area.appId)
        if (!app) {
          this.ctx.fillStyle = this.colorTransparent
        } else {
          let st = app.onOffState
          if (Array.isArray(st)) {
            st = st[area.index]
          }
          const override = this.colorOverrides.find((e) => e.id === area.appId && e.index === area.index)
          if (override) {
            this.ctx.fillStyle = this.colorGrey
          } else {
            switch (st) {
              case 'none':
                this.ctx.fillStyle = this.colorTransparent
                break
              case 'on':
                this.ctx.fillStyle = this.colorOn
                break
              case 'middle':
                this.ctx.fillStyle = this.colorMiddle
                break
              case 'off':
                this.ctx.fillStyle = this.colorOff
                break
              case 'error':
                this.ctx.fillStyle = this.colorError
            }
          }
        }
        this.ctx.fill()
      }
    },
    async getAppliances (showLoadingProgress) {
      this.loading = showLoadingProgress

      const appliances = []
      const newAreas = []
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
        const filtered = this.appliances.filter((a) => a.enabled && ((this.applianceTypeFilter !== undefined && this.applianceTypeFilter.find((e) => e === a.usageType)) || (this.classFqnFilter !== undefined && this.classFqnFilter.find((e) => e === a.classFqn))))
        if (filtered) {
          filtered.forEach(app => {
            if (app.type === 'RELAY_DUAL') {
              newAreas.push({
                title: app.config.relay1Name,
                appId: app.id,
                index: 0,
                iconPos: this.parseNumberArray(app.iconPos),
                coords: this.parseNumberArray(app.imgMapCoords)
              })
              newAreas.push({
                title: app.config.relay2Name,
                appId: app.id,
                index: 1,
                iconPos: this.parseNumberArray(app.iconPos1),
                coords: this.parseNumberArray(app.imgMapCoords1)
              })
            } else {
              newAreas.push({
                title: app.name,
                appId: app.id,
                iconPos: this.parseNumberArray(app.iconPos),
                coords: this.parseNumberArray(app.imgMapCoords)
              })
            }
          })
        }
        this.additionalAreas.forEach(area => {
          newAreas.push(area)
        })
        this.areas = newAreas
        this.redraw(true)
        this.loading = false
      })
    },
    parseNumberArray (a) {
      if (!a) {
        return undefined
      }
      return a.split(',').filter(x => x.trim().length && !isNaN(x)).map(Number)
    },
    isError (area) {
      const app = this.appMap.get(area.appId)
      if (!app) {
        return true
      }
      let st = app.onOffState
      if (Array.isArray(st)) {
        st = st[area.index]
      }
      if (st === 'error') {
        return true
      }
      return false
    },
    getColor (area) {
      const app = this.appMap.get(area.appId)
      if (!app) {
        return 'transparent'
      }
      const override = this.colorOverrides.find((e) => e.id === area.appId && e.index === area.index)
      if (override) {
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
    isOn (area) {
      const app = this.appMap.get(area.appId)
      if (!app) {
        return false
      }
      let st = app.onOffState
      if (Array.isArray(st)) {
        st = st[area.index]
      }
      if (st === 'on') {
        return true
      }
      return false
    }
  },

  mounted () {
    this.reCompose()
    this.getAppliances(true)
    this.interval = setInterval(() => this.getAppliances(false), 2000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}

.small {
  font-size: 11px;
}
</style>
