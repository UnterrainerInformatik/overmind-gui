<template>
  <div v-if="app && item">
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
    <!--
    brightness: {{ brightness }}<br>
    pause: {{ pause }}<br>
    waitForNextAppChange: {{ waitForNextAppChange }}<br>
    -->
  </div>
</template>

<script lang="js">
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'

export default {
  name: 'DebouncedBrightnessSlider',

  props: {
    item: {},
    app: {}
  },

  data: () => ({
    brightness: undefined,
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
      await this.setBrightness()
      this.waitForNextAppChange = true
      this.pause = false
    },
    mouseDown () {
      this.pause = true
    },
    getBrightness (app) {
      if (app && app.state && app.state.dimmers && app.state.dimmers[0] && app.state.dimmers[0].brightness !== undefined) {
        this.brightness = app.state.dimmers[0].brightness * 100
      }
    },
    async setBrightness () {
      await appliancesService.setBrightness(this.app.id, 'light', this.brightness / 100)
    }
  },

  mounted () {
    this.getBrightness(this.app)
    setInterval(() => {
      if (this.pause || this.waitForNextAppChange) {
        return
      }
      this.getBrightness(this.app)
    }, 500)
  }
}
</script>
