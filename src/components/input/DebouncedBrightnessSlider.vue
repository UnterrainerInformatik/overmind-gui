<template>
  <div v-if="app && item">
    <v-slider
      ref="slider"
      v-if="brightness !== undefined"
      class="mb-4"
      v-model="brightness"
      :color="
        (app.state.relays[0].state === 'ON' ? 'on ' : 'off ') + ' darken-1'
      "
      thumb-label="always"
      @start="mouseDown"
      @end="mouseUp"
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
    interval: null,
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
      console.log('mouseUp')
      this.waitForNextAppChange = true
      await this.setBrightness()
      this.pause = false
    },
    mouseDown () {
      console.log('mouseDown')
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
    this.interval = setInterval(() => {
      if (this.pause || this.waitForNextAppChange) {
        return
      }
      this.getBrightness(this.app)
    }, 500)

    addEventListener('touchstart', (event) => {
      this.touchStart(event)
    }, true)
  },

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}
</script>
