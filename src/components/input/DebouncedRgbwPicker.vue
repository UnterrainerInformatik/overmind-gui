<template>
  <div v-if="app && item">
    <v-row v-if="!disableWhite">
      <v-col v-if="colorModel" class="ma-0 mb-n2 pa-0">
        <div
          id="container"
          class="mb-4"
          style="
            border-radius: 10px;
            width: 478px;
            height: 50px;
            position: relative;
          "
        >
          <div
            id="layer1"
            :style="
              'border-radius: 10px;' +
              ' width: 100%; height: 100%; position: absolute; top: 0; left: 0;' +
              ' z-index: 10;' +
              ` background-color: black`
            "
          >
            &nbsp;
          </div>
          <div
            id="layer2"
            :style="
              'border-radius: 10px;' +
              ' width: 100%; height: 100%; position: absolute; top: 0; left: 0;' +
              ' z-index: 20;' +
              ` background-color: rgba(${colorModel.r}, ${colorModel.g}, ${colorModel.b}, ${colorModel.a})`
            "
          >
            &nbsp;
          </div>
          <div
            id="layer3"
            :style="
              'border-radius: 10px;' +
              ' width: 100%; height: 100%; position: absolute; top: 0; left: 0;' +
              ' z-index: 30;' +
              ` background-color: rgba(255, 255, 255, ${correctedWhite()})`
            "
          >
            &nbsp;
          </div>
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col v-if="colorModel">
        <v-color-picker
          @update:color="setColor"
          dot-size="31"
          :width="disableWhite ? '478px' : undefined"
          mode="rgba"
          v-model="colorModel"
        ></v-color-picker>
      </v-col>
      <v-col v-if="!disableWhite">
        <v-slider
          v-if="white !== undefined"
          v-model="white"
          class="mySlider"
          :style="cssVars"
          color="on"
          :thumb-color="getThumbColor(white)"
          vertical
          thumb-label="always"
          @start="mouseDownWhite"
          @end="mouseUpWhite"
        ></v-slider>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="js">
import { Debouncer } from '@/utils/debouncer'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'

export default {
  name: 'DebouncedColorPicker',

  props: {
    item: {},
    app: {},
    disableWhite: { default: false }
  },

  data: () => ({
    debouncer: null,
    colorModel: null,
    white: null,
    isDragging: false
  }),

  computed: {
    cssVars () {
      return {
        '--my-thumb-color': this.getTextColor(this.white)
      }
    }
  },

  watch: {
    'app.state.rgbws': {
      handler () {
        if (!this.isDragging) {
          this.getValues(this.app)
        }
      },
      deep: true
    }
  },

  methods: {
    correctedWhite () {
      if (this.white > 80) {
        return 0.8
      }
      return this.white / 100
    },
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
    packValues () {
      const v = this.colorModel
      return {
        red: v.r / 255,
        green: v.g / 255,
        blue: v.b / 255,
        white: this.white / 100,
        gain: v.a
      }
    },
    async mouseUpWhite () {
      await this.saveValues()
    },
    mouseDownWhite () {
      this.isDragging = true
    },
    getWhite (app) {
      if (app && app.state && app.state.rgbws && app.state.rgbws[0] && app.state.rgbws[0].white !== undefined) {
        return app.state.rgbws[0].white * 100
      }
      return null
    },
    async setColor () {
      this.isDragging = true
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
      this.debouncer.debounce(async () => {
        const v = this.packValues()
        await appliancesService.setColor(this.app.id, 'light', v.red, v.green, v.blue, v.white, v.gain)
        this.isDragging = false
      })
    },
    async immediatelySetValues () {
      if (this.colorModel !== undefined && this.white !== undefined) {
        const v = this.packValues()
        await appliancesService.setColor(this.app.id, 'light', v.red, v.green, v.blue, v.white, v.gain)
      }
    }
  },

  mounted () {
    this.debouncer = new Debouncer(500)
    this.getValues(this.app)
  }
}
</script>

<style lang="scss">
@import '../index.scss';

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
