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
      <div
        v-if="displayEnhancedDialog"
        class="sse-activity-indicator"
      >{{ displayMsgsPerMin }} · {{ displayLagMs }}</div>
      <span v-if="loaded">
        <span v-for="(icon, k) in icons" :key="'A' + k">
          <v-icon
            :color="icon.color ? icon.color : ''"
            :size="24 * icon.sizeMult"
            :style="`position: absolute; top: ${icon.y * scale}px; left: ${
              icon.x * scale
            }px`"
            >{{ icon.icon }}</v-icon
          >
        </span>
        <span v-for="(area, i) in getAreasWithIcon()" :key="i">
          <template v-if="isOccupancySensor(area) && coverageEllipseFor(area)">
            <div
              class="presence-coverage"
              :style="`top: ${coverageEllipseFor(area).topPx * scale}px; left: ${coverageEllipseFor(area).leftPx * scale}px; width: ${coverageEllipseFor(area).widthPx * scale}px; height: ${coverageEllipseFor(area).heightPx * scale}px; transform: translate(-50%, -50%) rotate(${coverageEllipseFor(area).yawDeg}deg);`"
            ></div>
          </template>
          <FloorplanDialogFactory
            v-if="constructIdFrom(area)"
            :item="area"
            :app="appFor(area.appId)"
            :ref="constructIdFrom(area)"
          ></FloorplanDialogFactory>
          <BatteryIndicator
            v-if="
              !isError(area) &&
              displayBattery(area) &&
              appFor(area.appId) &&
              !isHT(area)
            "
            :size="avatarBaseSize * scale"
            :level="
              Math.round(
                appFor(area.appId).state.batteries[0].batteryLevel * 100
              )
            "
            v-on:click="areaClicked($event, area, true)"
            :style="
              (clickableIcons
                ? 'cursor: pointer !important; '
                : 'cursor: default !important; ') +
              `position: absolute; top: ${area.iconPos[1] * scale}px; left: ${
                area.iconPos[0] * scale
              }px`
            "
          ></BatteryIndicator>
          <!-- Shelly HT additional info-field -->
          <v-card
            v-if="(!isError(area) || !appFor(area.appId)) && isHT(area)"
            :color="getBatteryLevelColor(area.appId)"
            v-on:click="areaClicked($event, area, true)"
            class="noFocus"
            :style="
              (clickableIcons
                ? 'cursor: pointer !important; '
                : 'cursor: default !important; ') +
              `position: absolute; top: ${area.iconPos[1] * scale}px; left: ${
                area.iconPos[0] * scale
              }px`
            "
          >
            <v-row
              class="ma-0 pa-0"
              v-if="appFor(area.appId).state.hasExternalPower == false"
            >
              <v-col class="ma-0 pa-0">
                <v-icon class="ma-0 pa-0" size="15" color="white"
                  >{{
                    overmindUtils.getBatteryIcon(
                      Math.round(
                        appFor(area.appId).state.batteries[0].batteryLevel *
                          100
                      )
                    )
                  }}<i class="" aria-hidden="true"></i
                ></v-icon> </v-col
              ><v-col class="ma-0 mr-1 pa-0">
                <span class="small"
                  >{{
                    Math.round(
                      appFor(area.appId).state.batteries[0].batteryLevel *
                        100
                    )
                  }}&nbsp;%</span
                >
              </v-col>
            </v-row>
            <v-row class="ma-0 pa-0">
              <v-col class="ma-0 pa-0">
                <v-icon class="ma-0 pa-0" size="15" color="white"
                  >thermostat</v-icon
                > </v-col
              ><v-col class="ma-0 mr-1 pa-0">
                <span class="small">{{ getTemperatureOf(area) }}&nbsp;°C</span>
              </v-col>
            </v-row>
            <v-row class="ma-0 pa-0">
              <v-col class="ma-0 pa-0">
                <v-icon class="ma-0 pa-0" size="15" color="white"
                  >water_drop</v-icon
                > </v-col
              ><v-col class="ma-0 mr-1 pa-0">
                <span class="small">{{ getHumidityOf(area) }}&nbsp;%</span>
              </v-col>
            </v-row>
          </v-card>
          <v-avatar
            v-if="
              (!isError(area) || !appFor(area.appId)) &&
              !displayBattery(area)
            "
            :size="avatarBaseSize * scale"
            :color="
              (getColor(area) == 'transparent'
                ? 'grey darken-3'
                : getColor(area)) +
              (allowQuickAction(area)
                ? ''
                : appFor(area.appId) === undefined ||
                  appFor(area.appId).switchable !== 'DETAIL_ONLY' ||
                  !displayEnhancedDialog
                ? ' darken-2'
                : '')
            "
            v-on:click="areaClicked($event, area, true)"
            class="noFocus"
            :style="
              (clickableIcons &&
              (allowQuickAction(area) ||
                (appFor(area.appId) !== undefined &&
                  appFor(area.appId).switchable === 'DETAIL_ONLY' &&
                  displayEnhancedDialog))
                ? 'cursor: pointer !important; '
                : 'cursor: default !important; ') +
              `position: absolute; top: ${area.iconPos[1] * scale}px; left: ${
                area.iconPos[0] * scale
              }px`
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
            v-if="isError(area) && appFor(area.appId)"
            :size="avatarBaseSize * scale"
            color="red"
            class="noFocus"
            v-on:click="areaClicked($event, area, true)"
            :style="
              (clickableIcons
                ? 'cursor: pointer !important; '
                : 'cursor: default !important; ') +
              `position: absolute; top: ${area.iconPos[1] * scale}px; left: ${
                area.iconPos[0] * scale
              }px`
            "
          >
            <v-icon size="20" color="white">bolt</v-icon>
          </v-avatar>
          <span v-if="isOccupancySensor(area)">
            <span v-for="pt in presencePointsFor(area)" :key="'pp-' + area.appId + '-' + pt.id">
              <div
                class="presence-point"
                :style="`top: ${pt.topPx * scale}px; left: ${pt.leftPx * scale}px; width: ${14 * scale}px; height: ${14 * scale}px;`"
              ></div>
            </span>
          </span>
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
          :coords="area.coords.map((e) => e * scale).toString()"
          shape="poly"
        />
      </map>
      <div
        v-if="calMode"
        class="presence-cal-overlay"
        :style="`width: ${imgWidth}px; height: ${imgHeight}px;`"
        v-on:click="onCalibrationClick"
      >
        <div
          v-if="calClickA"
          class="presence-cal-marker"
          :style="`top: ${calClickA.yPx * scale}px; left: ${calClickA.xPx * scale}px;`"
        ></div>
        <div class="presence-cal-hint">
          {{ calClickA ? 'click 2nd point exactly 10m from the first' : 'calibration mode — click first point' }}
        </div>
      </div>
      <!--
      img:{{ imgWidth }} / {{ imgHeight }} full:{{ fullImgWidth }} / {{ fullImgHeight }} scale:{{ scale }} scaleX:{{ scaleX }} scaleY:{{ scaleY }}
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
import { singleton as overmindUtils, pathsForApplianceType, setPathValue } from '@/utils/overmindUtils'
import { SseClient } from '@/utils/sseClient'
import { orientationFor } from '@/lib/presence/sensorOrientation'
import { specForApp } from '@/lib/presence/sensorSpecs'
import { pxPerMeter, setPxPerMeter } from '@/lib/presence/floorCalibration'

const DEBUG_TRANSPORTS = false
const DEBUG_PRESENCE = true
let lastLoggedPresenceKey = ''
let lastLoggedAppForSeq = -1

export default {
  name: 'Floorplan',

  components: {
    FloorplanDialogFactory,
    BatteryIndicator
  },

  props: {
    displayEnhancedDialog: { default: false },
    icon: {},
    icons: {
      type: Array,
      default () {
        return []
      }
    },
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
    sseHandle: null,
    overmindUtils,
    areas: [],
    loaded: false,
    ctx: null,
    appMap: new DoubleBufferedObservableMap(),
    updateSeq: 0,
    appliances: [],
    loading: true,
    fullImgWidth: 1276,
    fullImgHeight: 464,
    imgWidth: 1000,
    imgHeight: 363,
    avatarBaseSize: 46,
    readWidth: undefined,
    readHeight: undefined,
    colorOverrides: [],
    calMode: false,
    calClickA: null,
    calClickB: null,
    transportTimestamps: [],
    lagSamples: [],
    lagSampleIdx: 0,
    lastLagProbeAt: 0,
    lagProbeIntervalId: null,
    displayRefreshIntervalId: null,
    displayMsgsPerMin: '0 msgs/min',
    displayLagMs: '0 ms'
  }),

  computed: {
    scale () {
      return this.imgWidth / this.fullImgWidth
    },
    scaleX () {
      return this.imgWidth / this.fullImgWidth
    },
    scaleY () {
      return this.imgHeight / this.fullImgHeight
    }
  },

  watch: {
    updateSeq (newVal) {
      if (DEBUG_TRANSPORTS) {
        // eslint-disable-next-line no-console
        console.debug('[Floorplan updateSeq watch]', { newVal })
      }
    },
    displayEnhancedDialog (newVal, oldVal) {
      if (newVal && !oldVal) {
        this.startActivityIndicator()
      } else if (!newVal && oldVal) {
        this.stopActivityIndicator()
      }
    }
  },

  methods: {
    appFor (id) {
      // Reactive read of updateSeq: every bump in the transport-update callback
      // invalidates template expressions that route through appFor, forcing a
      // Vue-native re-render independent of the ObservableMap.changeTracker path.
      // Assigning to a const prevents dead-code elimination from stripping
      // the property access.
      const seq = this.updateSeq
      if (DEBUG_TRANSPORTS && id === 96 && seq !== lastLoggedAppForSeq) {
        lastLoggedAppForSeq = seq
        // eslint-disable-next-line no-console
        console.debug('[Floorplan appFor]', { id, seq })
      }
      return this.appMap.get(id)
    },
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
      const measured = this.$refs.backgroundMeasurement.getBoundingClientRect().width
      const nextWidth = measured - measured / 30
      const nextHeight = this.fullImgHeight * (nextWidth / this.fullImgWidth)
      const sizeChanged = nextWidth !== this.imgWidth || nextHeight !== this.imgHeight
      if (nextWidth !== this.imgWidth) {
        this.imgWidth = nextWidth
      }
      if (nextHeight !== this.imgHeight) {
        this.imgHeight = nextHeight
      }
      // Writing to <canvas> width/height attrs clears the pixel buffer, and
      // Vue applies those attrs in the next DOM patch. Defer the redraw so it
      // runs after the wipe, not before.
      const paint = () => {
        const canvas = this.$refs.canvas
        if (canvas) {
          this.ctx = canvas.getContext('2d')
        }
        this.redraw(false)
      }
      if (sizeChanged) {
        this.$nextTick(paint)
      } else {
        paint()
      }
    },
    displayBattery (area) {
      const app = this.appFor(area.appId)
      if (app === undefined) {
        return false
      }
      return app.batteryDriven || this.isHT(area)
    },
    isHT (area) {
      const app = this.appFor(area.appId)
      if (app === undefined) {
        return false
      }
      return app.classFqn === 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyHTAppliance' ||
        app.classFqn === 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyPlusHTAppliance'
    },
    getBatteryLevelColor (id) {
      const app = this.appFor(id)
      if (app.state.hasExternalPower) {
        return overmindUtils.getBatteryColor(100)
      }
      return overmindUtils.getBatteryColor(Math.round(app.state.batteries[0].batteryLevel * 100))
    },
    getTemperatureOf (area) {
      const app = this.appFor(area.appId)
      if (app === undefined) {
        return undefined
      }
      return overmindUtils.getTemperature(app)
    },
    getHumidityOf (area) {
      const app = this.appFor(area.appId)
      if (app === undefined) {
        return undefined
      }
      return overmindUtils.getHumidity(app)
    },
    allowQuickAction (area) {
      const app = this.appFor(area.appId)
      if (app === undefined) {
        return false
      }
      return app.switchable === undefined || app.switchable === null || app.switchable === 'TRUE'
    },
    getOuterRingColor (area) {
      const app = this.appFor(area.appId)
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
        return 'off'
      }
      if (st === 'off') {
        return 'on'
      }
      return 'transparent'
    },
    displayWatts (area) {
      return this.isOn(area) && this.getPowerOf(area, area.index) !== undefined
    },
    formatPower (p) {
      return overmindUtils.formatPower(p)
    },
    getPowerOf (area) {
      const app = this.appFor(area.appId)
      if (app === undefined) {
        return undefined
      }
      return overmindUtils.getPowerOf(app, area.index)
    },
    getAreasWithIcon () {
      return this.areas.filter(a => a.iconPos && a.iconPos[0] && a.iconPos[1])
    },
    isOccupancySensor (area) {
      const app = this.appFor(area.appId)
      return !!app && app.type === 'OCCUPANCY_SENSOR'
    },
    coverageEllipseFor (area) {
      const app = this.appFor(area.appId)
      if (!app || !area.iconPos || area.iconPos[0] === undefined || area.iconPos[1] === undefined) {
        return null
      }
      const spec = specForApp(app)
      if (!spec) {
        return null
      }
      const ppm = pxPerMeter()
      const orientation = orientationFor(area.appId)
      const half = this.avatarBaseSize / 2
      const wider = Math.max(spec.hFovDeg, spec.vFovDeg)
      const narrower = Math.min(spec.hFovDeg, spec.vFovDeg)
      // Asymmetric ellipse: full range along the wider-FOV axis (sensor +y),
      // proportionally shorter along the narrower-FOV axis (sensor +x).
      const ryM = spec.rangeM
      const rxM = spec.rangeM * (narrower / wider)
      return {
        leftPx: area.iconPos[0] + half,
        topPx: area.iconPos[1] + half,
        widthPx: 2 * rxM * ppm,
        heightPx: 2 * ryM * ppm,
        yawDeg: orientation.yawDeg
      }
    },
    onCalibrationClick (event) {
      if (!this.calMode) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget
      const rect = target.getBoundingClientRect()
      const xScreen = event.clientX - rect.left
      const yScreen = event.clientY - rect.top
      const point = { xPx: xScreen / this.scale, yPx: yScreen / this.scale }
      if (!this.calClickA) {
        this.calClickA = point
        this.calClickB = null
        // eslint-disable-next-line no-console
        console.info('[calibration] click 1 captured at', point, '— click the second point exactly 10m away')
        return
      }
      this.calClickB = point
      const dx = point.xPx - this.calClickA.xPx
      const dy = point.yPx - this.calClickA.yPx
      const distancePx = Math.sqrt(dx * dx + dy * dy)
      const result = distancePx / 10
      setPxPerMeter(result)
      // eslint-disable-next-line no-console
      console.info('[calibration] pxPerMeter=' + result.toFixed(2) + ' (saved to localStorage). Promote to floorCalibration.ts when ready.')
      this.calClickA = null
      this.calClickB = null
      this.updateSeq += 1
      this.redraw(false)
    },
    presencePointsFor (area) {
      const app = this.appFor(area.appId)
      if (!app || !area.iconPos || area.iconPos[0] === undefined || area.iconPos[1] === undefined) {
        return []
      }
      if (app.onOffState === 'error') {
        return []
      }
      const presence0 = app.state && app.state.presences && app.state.presences[0]
      if (!presence0 || presence0.presence !== true) {
        return []
      }
      const objects = presence0.objects
      if (!Array.isArray(objects) || objects.length === 0) {
        return []
      }
      const orientation = orientationFor(area.appId)
      const yawRad = (orientation.yawDeg * Math.PI) / 180
      const cosY = Math.cos(yawRad)
      const sinY = Math.sin(yawRad)
      const half = this.avatarBaseSize / 2
      const ix = area.iconPos[0] + half
      const iy = area.iconPos[1] + half
      const ppm = pxPerMeter()
      const points = []
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i]
        if (!obj || typeof obj.x !== 'number' || typeof obj.y !== 'number') {
          continue
        }
        const dx = (cosY * obj.x - sinY * obj.y) * ppm
        // Plan-Y is screen-down (matches iconPos convention); sensor +y points away
        // from the sensor face into the room — we mirror it onto plan-Y so that a
        // target with positive sensor-y sits "below" the sensor icon on the plan.
        const dy = (sinY * obj.x + cosY * obj.y) * ppm
        const leftPx = ix + dx
        const topPx = iy + dy
        if (DEBUG_PRESENCE) {
          const key = area.appId + ':' + i + ':' + obj.x + ':' + obj.y
          if (key !== lastLoggedPresenceKey) {
            lastLoggedPresenceKey = key
            // eslint-disable-next-line no-console
            console.debug('[presence-pt]', {
              appId: area.appId,
              i,
              obj_x: obj.x,
              obj_y: obj.y,
              ppm,
              yawDeg: orientation.yawDeg,
              dx_unscaled: dx,
              dy_unscaled: dy,
              ix_unscaled: ix,
              iy_unscaled: iy,
              leftPx_unscaled: leftPx,
              topPx_unscaled: topPx,
              scale: this.scale,
              left_screen: leftPx * this.scale,
              top_screen: topPx * this.scale
            })
          }
        }
        points.push({
          id: obj.id !== undefined && obj.id !== null ? obj.id : i,
          leftPx,
          topPx
        })
      }
      return points
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
      const app = this.appFor(area.appId)
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
          if (this.allowQuickAction(area)) {
            this.$refs[this.constructIdFrom(area)][0].defaultAction()
          }
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
        const item = this.appFor(area.appId)
        overmindUtils.addOnOffStateTo(item, area.index)
      }
      for (const area of this.getAreasWithCoords()) {
        this.ctx.beginPath()
        this.ctx.moveTo(area.coords[0] * scale, area.coords[1] * scale)
        for (let item = 2; item < area.coords.length - 1; item += 2) {
          this.ctx.lineTo(area.coords[item] * scale, area.coords[item + 1] * scale)
        }
        this.ctx.closePath()
        const app = this.appFor(area.appId)
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
      // Resolve appliance-groups for initial render: the group inherits the first
      // child's state/type/classFqn so display logic can treat it uniformly.
      // `lastTimeOnline` is the freshest across all children — a group is online
      // if any child is. Live updates arrive via `representsGroups` on
      // transport-update triples and via the anyChildToGroupIds mirror below.
      for (const appliance of appliances) {
        if ((appliance.type === 'GROUP_PARALLEL' || appliance.type === 'GROUP_SERIAL') && appliance.config && appliance.config.applianceIds) {
          let firstChildResolved = false
          let freshestLastTimeOnline = null
          for (const id of appliance.config.applianceIds) {
            const subApp = await appliancesService.getById(id)
            overmindUtils.parseState(subApp)
            overmindUtils.parseConfig(subApp)
            if (!firstChildResolved) {
              appliance.lastTimeSetup = subApp.lastTimeSetup
              appliance.state = subApp.state
              appliance.type = subApp.type
              appliance.classFqn = subApp.classFqn
              firstChildResolved = true
            }
            if (subApp.lastTimeOnline && (!freshestLastTimeOnline || subApp.lastTimeOnline > freshestLastTimeOnline)) {
              freshestLastTimeOnline = subApp.lastTimeOnline
            }
          }
          appliance.lastTimeOnline = freshestLastTimeOnline
        }
      }
      appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
      this.appliances = appliances
      this.appMap.backingMap.clear()
      for (const element of this.appliances) {
        this.appMap.backingMap.set(element.id, element)
      }
      const filtered = this.appliances.filter((a) => a.enabled && ((this.applianceTypeFilter !== undefined && this.applianceTypeFilter.find((e) => e === a.usageType || e === a.type)) || (this.classFqnFilter !== undefined && this.classFqnFilter.find((e) => e === a.classFqn))))
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
      const app = this.appFor(area.appId)
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
      const app = this.appFor(area.appId)
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
      if (app && app.state && app.iconPos1) {
        if (app.state[app.iconPos1] > 0) {
          return 'on'
        } else {
          return 'off'
        }
      }
      return 'transparent'
    },
    isOn (area) {
      const app = this.appFor(area.appId)
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
      if (app && app.state && app.iconPos1 && app.state[app.iconPos1] > 0) {
        return true
      }
      return false
    },
    startActivityIndicator () {
      this.transportTimestamps = []
      this.lagSamples = new Array(600).fill(0)
      this.lagSampleIdx = 0
      this.lastLagProbeAt = Date.now()
      this.lagProbeIntervalId = window.setInterval(this.probeLag, 100)
      this.displayRefreshIntervalId = window.setInterval(this.refreshActivityDisplay, 1000)
      this.refreshActivityDisplay()
    },
    stopActivityIndicator () {
      if (this.lagProbeIntervalId !== null) {
        window.clearInterval(this.lagProbeIntervalId)
        this.lagProbeIntervalId = null
      }
      if (this.displayRefreshIntervalId !== null) {
        window.clearInterval(this.displayRefreshIntervalId)
        this.displayRefreshIntervalId = null
      }
    },
    probeLag () {
      const now = Date.now()
      const delay = Math.max(0, now - this.lastLagProbeAt - 100)
      this.lagSamples[this.lagSampleIdx] = delay
      this.lagSampleIdx = (this.lagSampleIdx + 1) % 600
      this.lastLagProbeAt = now
    },
    refreshActivityDisplay () {
      const cutoff = Date.now() - 60000
      while (this.transportTimestamps.length > 0 && this.transportTimestamps[0] < cutoff) {
        this.transportTimestamps.shift()
      }
      const msgs = this.transportTimestamps.length
      let sum = 0
      let populated = 0
      for (let i = 0; i < this.lagSamples.length; i += 1) {
        const v = this.lagSamples[i]
        if (v !== undefined) {
          sum += v
          populated += 1
        }
      }
      const lagAvg = populated > 0 ? Math.round(sum / populated) : 0
      this.displayMsgsPerMin = `${msgs} msgs/min`
      this.displayLagMs = `${lagAvg} ms`
    }
  },

  async mounted () {
    try {
      this.calMode = new URLSearchParams(window.location.search).get('cal') === '1'
    } catch {
      this.calMode = false
    }
    this.reCompose()
    await this.getAppliances(true)

    const seen = new Set()
    const perAppliance = []
    const primaryChildToGroupIds = new Map()
    const anyChildToGroupIds = new Map()
    const groupChildPower = new Map()
    for (const area of this.areas) {
      if (!area.appId || seen.has(area.appId)) {
        continue
      }
      seen.add(area.appId)
      const app = this.appFor(area.appId)
      if (!app) {
        continue
      }
      if (app.config && Array.isArray(app.config.applianceIds) && app.config.applianceIds.length > 0) {
        const primaryChildId = app.config.applianceIds[0]
        if (!primaryChildToGroupIds.has(primaryChildId)) {
          primaryChildToGroupIds.set(primaryChildId, new Set())
        }
        primaryChildToGroupIds.get(primaryChildId).add(app.id)
        for (const childId of app.config.applianceIds) {
          if (!anyChildToGroupIds.has(childId)) {
            anyChildToGroupIds.set(childId, new Set())
          }
          anyChildToGroupIds.get(childId).add(app.id)
        }
        groupChildPower.set(app.id, new Map())
      }
      const paths = pathsForApplianceType(app.type, 'compact')
      if (paths.length === 0) {
        continue
      }
      perAppliance.push({ applianceId: area.appId, paths })
    }
    if (perAppliance.length === 0) {
      return
    }
    const writePath = (targetApp, path, value, applianceId) => {
      if (DEBUG_TRANSPORTS) {
        // eslint-disable-next-line no-console
        console.debug('[Floorplan writePath]', { applianceId, path, value, matched: !!targetApp })
      }
      if (!targetApp) {
        return
      }
      if (path === 'lastTimeOnline') {
        // Never regress lastTimeOnline to a falsy value. Groups in particular
        // have a NULL stored lastTimeOnline that the backend re-emits on the
        // initial transport-update batch — without this guard it would wipe
        // the value derived from children at register-time and flip the group
        // to 'error' until a real child heartbeat arrives.
        if (value) {
          this.$set(targetApp, 'lastTimeOnline', value)
        }
        return
      }
      if (!targetApp.state) {
        this.$set(targetApp, 'state', {})
      }
      setPathValue(targetApp.state, path, value)
    }
    this.sseHandle = await SseClient.getInstance().registerTransport({
      minInterval: 1000,
      selection: { perAppliance }
    }, (payload) => {
      if (!payload || !payload.values) {
        return
      }
      if (this.displayEnhancedDialog) {
        this.transportTimestamps.push(Date.now())
      }
      if (DEBUG_TRANSPORTS) {
        const firstTwo = payload.values.slice(0, 2).map(t => ({
          applianceId: t.applianceId,
          path: t.path,
          value: t.value,
          representsGroups: t.representsGroups
        }))
        // eslint-disable-next-line no-console
        console.debug('[Floorplan transport-update]', {
          sseHandleId: this.sseHandle ? this.sseHandle.id : null,
          count: payload.values.length,
          firstTwo
        })
      }
      for (const triple of payload.values) {
        writePath(this.appMap.get(triple.applianceId), triple.path, triple.value, triple.applianceId)
        if (Array.isArray(triple.representsGroups)) {
          for (const gid of triple.representsGroups) {
            writePath(this.appMap.get(gid), triple.path, triple.value, gid)
          }
        }
        const powerMatch = triple.path.match(/^relays\[(\d+)\]\.power$/)
        if (powerMatch) {
          // Aggregate relay power across all children of each containing group.
          const relayIdx = Number(powerMatch[1])
          const groups = anyChildToGroupIds.get(triple.applianceId)
          if (groups) {
            for (const gid of groups) {
              const perGroup = groupChildPower.get(gid)
              if (!perGroup.has(triple.applianceId)) {
                perGroup.set(triple.applianceId, new Map())
              }
              perGroup.get(triple.applianceId).set(relayIdx, Number(triple.value) || 0)
              let sum = 0
              for (const perChild of perGroup.values()) {
                const v = perChild.get(relayIdx)
                if (v !== undefined) {
                  sum += v
                }
              }
              writePath(this.appMap.get(gid), triple.path, sum, gid)
            }
          }
        } else if (triple.path === 'lastTimeOnline') {
          // lastTimeOnline mirrors from ANY child (a group is online if any
          // child is), with newer-wins so an out-of-order older heartbeat
          // from a less-recent child can't regress the group.
          const groups = anyChildToGroupIds.get(triple.applianceId)
          if (groups) {
            for (const gid of groups) {
              const groupApp = this.appMap.get(gid)
              if (groupApp && (!groupApp.lastTimeOnline || triple.value > groupApp.lastTimeOnline)) {
                writePath(groupApp, triple.path, triple.value, gid)
              }
            }
          }
        } else {
          // Other non-aggregate paths mirror from the primary child only,
          // matching the initial-state copy in getAppliances() — preserves
          // the display-uniformity contract for state.relays[0].state etc.
          const groups = primaryChildToGroupIds.get(triple.applianceId)
          if (groups) {
            for (const gid of groups) {
              writePath(this.appMap.get(gid), triple.path, triple.value, gid)
            }
          }
        }
      }
      this.updateSeq += 1
      this.redraw(false)
    })
    if (DEBUG_TRANSPORTS) {
      // eslint-disable-next-line no-console
      console.debug('[Floorplan mounted]', { sseHandleId: this.sseHandle ? this.sseHandle.id : null })
    }
    if (this.displayEnhancedDialog) {
      this.startActivityIndicator()
    }
  },

  beforeDestroy () {
    if (DEBUG_TRANSPORTS) {
      // eslint-disable-next-line no-console
      console.debug('[Floorplan beforeDestroy]', { sseHandleId: this.sseHandle ? this.sseHandle.id : null })
    }
    this.stopActivityIndicator()
    if (this.sseHandle) {
      SseClient.getInstance().unregisterTransport(this.sseHandle)
      this.sseHandle = null
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

.presence-point {
  position: absolute;
  border-radius: 50%;
  background: rgba(180, 255, 170, 0.95);
  border: 1px solid rgba(40, 90, 40, 0.7);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.presence-coverage {
  position: absolute;
  border-radius: 50%;
  background: rgba(120, 180, 255, 0.12);
  border: 1px dashed rgba(120, 180, 255, 0.5);
  pointer-events: none;
}

.presence-cal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  cursor: crosshair;
  z-index: 10;
}

.presence-cal-marker {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 200, 0, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.6);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.presence-cal-hint {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  border-radius: 4px;
  pointer-events: none;
}

.sse-activity-indicator {
  position: absolute;
  top: 4px;
  right: 16px;
  font-size: 12px;
  line-height: 1.2;
  font-family: monospace;
  color: rgba(190, 190, 230, 1);
  pointer-events: none;
  user-select: none;
  z-index: 5;
}
</style>
