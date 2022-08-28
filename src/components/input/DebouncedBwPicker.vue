<template>
  <div v-if="app && item">
    <v-sheet class="mx-6 mt-16 mb-0">
      <v-row>
        <v-col>
      <v-slider
        v-if="brightness !== undefined"
        class="mb-4"
        v-model="brightness"
        :color="
          (app.state.relays[0].state === 'ON' ? 'on ' : 'off ') + ' darken-1'
        "
        thumb-label="always"
        @mouseup="mouseUp"
        @mousedown="mouseDown"
      ></v-slider>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="2">
          hot
        </v-col>
        <v-col>
      <v-slider
        v-if="temp !== undefined"
        class="mb-4"
        v-model="temp"
        :color="
          (app.state.relays[0].state === 'ON' ? 'on ' : 'off ') + ' darken-1'
        "
        thumb-label="always"
        @mouseup="mouseUp"
        @mousedown="mouseDown"
      ></v-slider>
        </v-col>
        <v-col cols="2">
          cold
        </v-col>
      </v-row>
      <!--
    brightness: {{ brightness }}<br>
    temp: {{ temp }}<br>
    color: {{ pause }}<br>
    waitForNextAppChange: {{ waitForNextAppChange }}<br>
    -->
    </v-sheet>
  </div>
</template>

<script lang="js">
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'

export default {
  name: 'DebouncedBwPicker',

  props: {
    item: {},
    app: {}
  },

  data: () => ({
    brightness: undefined,
    temp: undefined,
    pause: false,
    waitForNextAppChange: false
  }),

  computed: {
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
    async mouseUp () {
      await this.immediatelySetValues()
      this.waitForNextAppChange = true
      this.pause = false
    },
    mouseDown () {
      this.pause = true
    },
    getBrightness (app) {
      if (app && app.state && app.state.rgbws && app.state.rgbws[0] && app.state.rgbws[0].brightness !== undefined) {
        this.brightness = app.state.rgbws[0].brightness * 100
      }
    },
    getTemp (app) {
      if (app && app.state && app.state.rgbws && app.state.rgbws[0] && app.state.rgbws[0].colorTemperature !== undefined) {
        this.temp = app.state.rgbws[0].colorTemperature * 100
      }
    },
    async immediatelySetValues () {
      if (this.brightness !== undefined && this.temp !== undefined) {
        await appliancesService.setWhite(this.app.id, 'light', this.brightness / 100, this.temp / 100)
      }
    }
  },

  mounted () {
    this.getBrightness(this.app)
    this.getTemp(this.app)
    setInterval(() => {
      if (this.pause || this.waitForNextAppChange) {
        return
      }
      this.getBrightness(this.app)
      this.getTemp(this.app)
    }, 500)
  }
}
</script>
