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
    isDragging: false
  }),

  watch: {
    'app.state.dimmers': {
      handler () {
        if (!this.isDragging) {
          this.getBrightness(this.app)
        }
      },
      deep: true
    }
  },

  methods: {
    async mouseUp () {
      const sent = this.brightness / 100
      await appliancesService.setBrightness(this.app.id, 'light', sent)
      this.isDragging = false
    },
    mouseDown () {
      this.isDragging = true
    },
    getBrightness (app) {
      if (app && app.state && app.state.dimmers && app.state.dimmers[0] && app.state.dimmers[0].brightness !== undefined) {
        this.brightness = app.state.dimmers[0].brightness * 100
      }
    }
  },

  mounted () {
    this.getBrightness(this.app)
  }
}
</script>
