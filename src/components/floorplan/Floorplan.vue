<template>
  <span>
    <v-row
      v-resize="reCompose"
      ref="backgroundMeasurement"
      class="ma-0 pa-0"
    ></v-row>
    <div :style="`position: relative; width: 100vw`">
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
          <FloorplanDialogFactory v-if="constructIdFrom(area)" :item="area" :app="appMap.get(area.appId)" :ref="constructIdFrom(area)"></FloorplanDialogFactory>
          <BatteryIndicator
            v-if="
              !isError(area) && displayBattery(area) && appMap.get(area.appId) && !isHT(area)
            "
            :size="avatarBaseSize * scale"
            :level="
              Math.round(
                appMap.get(area.appId).state.batteries[0].batteryLevel * 100
              )
            "
            v-on:click="areaClicked($event, area, true)"
            :style="
              (clickableIcons
                ? 'cursor: pointer !important; '
                : 'cursor: default !important; ') +
                `position: absolute; top: ${area.iconPos[1] *
                  scale}px; left: ${area.iconPos[0] * scale}px`
            "
          ></BatteryIndicator>
          <!-- Shelly HT additional info-field -->
          <v-card
            v-if="
              (!isError(area) || !appMap.get(area.appId)) &&
                isHT(area)
            "
            :color="getBatteryLevelColor(area.appId)"
            v-on:click="areaClicked($event, area, true)"
            class="noFocus"
            :style="
              (clickableIcons
                ? 'cursor: pointer !important; '
                : 'cursor: default !important; ') +
                `position: absolute; top: ${(area.iconPos[1]) *
                  scale}px; left: ${(area.iconPos[0]) * scale}px`
            "
          >
            <v-row class="ma-0 pa-0" v-if="appMap.get(area.appId).state.hasExternalPower == false">
              <v-col class="ma-0 pa-0">
                <v-icon
                    class="ma-0 pa-0"
                    size="15"
                    color='white'
                    >{{overmindUtils.getBatteryIcon(Math.round(
                      appMap.get(area.appId).state.batteries[0].batteryLevel * 100
                    ))}}<i class="" aria-hidden="true"></i></v-icon
                  >
              </v-col><v-col class="ma-0 mr-1 pa-0">
                <span class="small">{{
                  Math.round(
                    appMap.get(area.appId).state.batteries[0].batteryLevel * 100
                  )
                }}&nbsp;%</span>
              </v-col>
            </v-row>
            <v-row class="ma-0 pa-0">
              <v-col class="ma-0 pa-0">
                <v-icon
                    class="ma-0 pa-0"
                    size="15"
                    color='white'
                    >thermostat</v-icon
                  >
              </v-col><v-col class="ma-0 mr-1 pa-0">
                <span class="small">{{
                  getTemperatureOf(area)
                }}&nbsp;°C</span>
              </v-col>
            </v-row>
            <v-row class="ma-0 pa-0">
              <v-col class="ma-0 pa-0">
                <v-icon
                    class="ma-0 pa-0"
                    size="15"
                    color='white'
                    >water_drop</v-icon
                  >
              </v-col><v-col class="ma-0 mr-1 pa-0">
                <span class="small">{{
                  getHumidityOf(area)
                }}&nbsp;%</span>
              </v-col>
            </v-row>
          </v-card>
          <v-avatar
            v-if="
              (!isError(area) || !appMap.get(area.appId)) &&
                !displayBattery(area)
            "
            :size="avatarBaseSize * scale"
            :color="
              getColor(area) == 'transparent' ? 'grey darken-3' : getColor(area)
            "
            v-on:click="areaClicked($event, area, true)"
            class="noFocus"
            :style="
              (clickableIcons
                ? 'cursor: pointer !important; '
                : 'cursor: default !important; ') +
                `position: absolute; top: ${area.iconPos[1] *
                  scale}px; left: ${area.iconPos[0] * scale}px`
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
            :size="avatarBaseSize * scale"
            color="red"
            class="noFocus"
            v-on:click="areaClicked($event, area, true)"
            :style="
              (clickableIcons
                ? 'cursor: pointer !important; '
                : 'cursor: default !important; ') +
                `position: absolute; top: ${area.iconPos[1] *
                  scale}px; left: ${area.iconPos[0] * scale}px`
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
        rel="preload"
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
          :coords="area.coords.map(e => e * scale).toString()"
          shape="poly"
        />
      </map>
      <!--
      img:{{ imgWidth }} / {{ imgHeight }} full:{{ fullImgWidth }} / {{ fullImgHeight }} scale:{{ scale }}
      -->
    </div>
  </span>
</template>

<style lang="scss">
@import '../index.scss';
</style>

<script lang="js">
import BatteryIndicator from '@/components/BatteryIndicator.vue'
import FloorplanDialogFactory from '@/components/floorplan/dialogs/FloorplanDialogFactory.vue'
import { DoubleBufferedObservableMap } from '@/utils/doubleBufferedObservableMap'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { singleton as overmindUtils } from '@/utils/overmindUtils'

export default {
  name: 'Floorplan',

  components: {
    FloorplanDialogFactory,
    BatteryIndicator
  },

  props: {
    displayEnhancedDialog: { default: false },
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
    interval: null,
    overmindUtils,
    areas: [],
    loaded: false,
    ctx: null,
    appMap: new DoubleBufferedObservableMap(),
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
    scale () {
      return this.imgWidth / this.fullImgWidth
    }
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
    constructIdFrom (area) {
      if (area.appId === 0) {
        return null
      }
      return 'dialog-' + area.appId + (area.index ? ('-' + area.index) : '')
    },
    reCompose () {
      if (!this.$refs.backgroundMeasurement) {
        return
      }
      this.imgWidth = this.$refs.backgroundMeasurement.getBoundingClientRect().width
      this.imgWidth = this.imgWidth - this.imgWidth / 30
      this.imgHeight = this.fullImgHeight * this.scale
      const canvas = this.$refs.canvas
      this.ctx = canvas.getContext('2d')
      this.redraw(false)
      this.imgWidthOrHeightDebounce = false
    },
    displayBattery (area) {
      const app = this.appMap.get(area.appId)
      if (app === undefined) {
        return false
      }
      return app.batteryDriven || this.isHT(area)
    },
    isHT (area) {
      const app = this.appMap.get(area.appId)
      if (app === undefined) {
        return false
      }
      return app.classFqn === 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyHTAppliance' ||
        app.classFqn === 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyPlusHTAppliance'
    },
    getBatteryLevelColor (id) {
      const app = this.appMap.get(id)
      if (app.state.hasExternalPower) {
        return overmindUtils.getBatteryColor(100)
      }
      return overmindUtils.getBatteryColor(Math.round(app.state.batteries[0].batteryLevel * 100))
    },
    getTemperatureOf (area) {
      const app = this.appMap.get(area.appId)
      if (app === undefined) {
        return undefined
      }
      return overmindUtils.getTemperature(app)
    },
    getHumidityOf (area) {
      const app = this.appMap.get(area.appId)
      if (app === undefined) {
        return undefined
      }
      return overmindUtils.getHumidity(app)
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
      this.redraw(false)
      if (this.constructIdFrom(area)) {
        if (this.displayEnhancedDialog) {
          this.$refs[this.constructIdFrom(area)][0].show()
        } else {
          this.$refs[this.constructIdFrom(area)][0].defaultAction()
        }
      }
    },
    redraw (reset) {
      if (reset) {
        this.colorOverrides = []
      }
      const scale = this.scale
      this.ctx.clearRect(0, 0, this.imgWidth, this.imgHeight)
      for (const area of this.areas) {
        const item = this.appMap.get(area.appId)
        overmindUtils.addOnOffStateTo(item, area.index)
      }
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
            if (app.colorPalette) {
              this.ctx.fillStyle = app.colorPalette()
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
        }
        this.ctx.fill()
      }
    },
    async getAppliances (showLoadingProgress) {
      this.loading = showLoadingProgress

      const appliances = []
      const newAreas = []
      const response = await appliancesService.getList()
      response.entries.forEach(element => {
        overmindUtils.parseState(element)
        overmindUtils.parseConfig(element)
        appliances.push(element)
      })
      // Resolve appliance-groups in a reasonable way.
      for (const appliance of appliances) {
        if ((appliance.type === 'GROUP_PARALLEL' || appliance.type === 'GROUP_SERIAL') && appliance.config && appliance.config.applianceIds) {
          for (const id of appliance.config.applianceIds) {
            const subApp = await appliancesService.getById(id)
            overmindUtils.parseState(subApp)
            overmindUtils.parseConfig(subApp)
            appliance.lastTimeOnline = subApp.lastTimeOnline
            appliance.lastTimeSetup = subApp.lastTimeSetup
            appliance.state = subApp.state
            appliance.type = subApp.type
            appliance.classFqn = subApp.classFqn
            break
          }
        }
      }
      appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
      this.appliances = appliances
      this.appMap.backingMap.clear()
      for (const element of this.appliances) {
        this.appMap.backingMap.set(element.id, element)
      }
      const filtered = this.appliances.filter((a) => a.enabled && ((this.applianceTypeFilter !== undefined && this.applianceTypeFilter.find((e) => e === a.usageType)) || (this.classFqnFilter !== undefined && this.classFqnFilter.find((e) => e === a.classFqn))))
      if (filtered) {
        filtered.forEach(app => {
          const iconPos = this.parseNumberArray(app.iconPos)
          const icon1Pos = this.parseNumberArray(app.iconPos1)
          if (app.type === 'RELAY_DUAL') {
            newAreas.push({
              title: app.config.relay1Name,
              appId: app.id,
              index: 0,
              iconPos: iconPos,
              coords: this.parseNumberArray(app.imgMapCoords)
            })
            newAreas.push({
              title: app.config.relay2Name,
              appId: app.id,
              index: 1,
              iconPos: icon1Pos,
              coords: this.parseNumberArray(app.imgMapCoords1)
            })
          } else {
            newAreas.push({
              title: app.name,
              appId: app.id,
              iconPos: iconPos,
              coords: this.parseNumberArray(app.imgMapCoords)
            })
          }
        })
      }
      this.additionalAreas.forEach(area => {
        newAreas.push(area)
      })
      this.appMap.swap()
      this.areas = newAreas
      this.redraw(true)
      this.loading = false
      this.loaded = true
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
    this.interval = setInterval(() => this.getAppliances(false), 600)
  },

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}
</script>

<style lang="scss">
@import '../index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}

.small {
  font-size: 11px;
}
</style>
