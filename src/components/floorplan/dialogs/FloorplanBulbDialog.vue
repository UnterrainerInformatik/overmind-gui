<template>
  <div v-if="app && item">
    <v-row>
      <v-col v-if="colorModel">
        <div id="container" class="mb-4" style="width: 300px; height: 50px; position: relative;">
          <div id="navi" :style="`width: 100%; height: 100%; position: absolute; top: 0; left: 0; background-color: rgba(${colorModel.r}, ${colorModel.g}, ${colorModel.b}, ${colorModel.a})`">&nbsp;</div>
          <div id="infoi" :style="`width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 10; background-color: rgba(255, 255, 255, ${white / 100})`">&nbsp;</div>
        </div>
        <v-color-picker
          @update:color="setColor"
          dot-size="31"
          mode="rgba"
          v-model="colorModel"
        ></v-color-picker>
      </v-col>
      <v-col>
        <v-slider v-if="white !== undefined" v-model="white" class="mySlider" :style="cssVars" color="on" :thumb-color="getThumbColor(white)" vertical thumb-label="always" @mouseup="mouseUpWhite" @mousedown="mouseDownWhite"></v-slider>
      </v-col>
    </v-row>
    <br>
    <v-btn @click="toggle()" block height="42" :color="
            (app.state.relays[0].state === 'ON' ? 'on ' : 'off ') +
            ' darken-1'
          ">
      <v-icon>power_settings_new</v-icon>
    </v-btn>
    colorModel: {{ colorModel }}<br>
    pause: {{ pause }}<br>
    waitForNextAppChange: {{ waitForNextAppChange }}<br>
  </div>
</template>

<script lang="js">
import { Debouncer } from '@/utils/debouncer'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'

export default {
  name: 'FloorplanDimmerDialog',

  props: {
    item: {},
    app: {}
  },

  components: {
  },

  data: () => ({
    debouncer: null,
    pause: false,
    colorModel: null,
    white: null,
    waitForNextAppChange: false
  }),

  computed: {
    cssVars () {
      return {
        '--my-thumb-color': this.getTextColor(this.white)
      }
    }
  },

  watch: {
    app: {
      handler: function () {
        this.waitForNextAppChange = false
      },
      deep: true
    }
  },

  methods: {
    getThumbColor (white) {
      let v = white / 100
      if (v < 0.15) {
        v = 0.15
      }
      const result = `rgba(255, 255, 255, ${v})`
      return result
    },
    getTextColor (white) {
      let v = 0
      if (white < 50) {
        v = 255
      }
      return `rgba(${v}, ${v}, ${v}, 1)`
    },
    async mouseUpWhite () {
      await this.saveValues()
    },
    mouseDownWhite () {
      this.pause = true
    },
    getWhite (app) {
      if (app && app.state && app.state.rgbws && app.state.rgbws[0] && app.state.rgbws[0].white !== undefined) {
        return app.state.rgbws[0].white * 100
      }
      return null
    },
    async setColor () {
      await this.saveValues()
    },
    getValues (app) {
      if (app && app.state && app.state.rgbws && app.state.rgbws[0] && app.state.rgbws[0].white !== undefined) {
        this.white = app.state.rgbws[0].white * 100
      }
      if (app && app.state && app.state.rgbws && app.state.rgbws[0]) {
        const v = app.state.rgbws[0]
        this.colorModel = {
          r: v.red * 255,
          g: v.green * 255,
          b: v.blue * 255,
          a: v.gain
        }
      }
    },
    async saveValues () {
      const v = this.colorModel
      this.debouncer.debounce(() => {
        appliancesService.setColor(this.app.id, 'light', v.r / 255, v.g / 255, v.b / 255, this.white / 100, v.a)
      })
    },
    async toggle () {
      const actorPath = this.getActorPathOf(this.app, this.item.index)
      let st = this.app.onOffState
      if (Array.isArray(st)) {
        st = st[this.item.index]
      }
      if (st === 'on') {
        await appliancesService.turnOff(this.app.id, actorPath)
      }
      if (st === 'off') {
        await appliancesService.turnOn(this.app.id, actorPath)
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
    }
  },

  mounted () {
    this.debouncer = new Debouncer({
      timeout: 500,
      whenDebounceCalled: () => { this.pause = true },
      whenEmptyEvent: () => {
        this.waitForNextAppChange = true
        this.pause = false
      }
    })
    this.getValues(this.app)
    setInterval(() => {
      if (this.pause || this.waitForNextAppChange) {
        return
      }
      this.getValues(this.app)
    }, 500)
  }
}
</script>

<style lang="scss">
@import '../../index.scss';

.mySlider .v-slider__thumb-label {
  color: var(--my-thumb-color);
}

.middle {
  font-size: 15px;
  font-weight: normal;
  line-height: 20px;
}
.small {
  font-size: 10px;
  font-weight: normal;
  line-height: 10px;
}
.bold {
  font-weight: bold;
}
</style>
