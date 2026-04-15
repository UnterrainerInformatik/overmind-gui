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
import { EchoGate, floatEchoMatcher } from '@/utils/echoGate'

export default {
  name: 'DebouncedBrightnessSlider',

  props: {
    item: {},
    app: {}
  },

  data: () => ({
    interval: null,
    brightness: undefined,
    gate: null,
    unwatchFields: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    async mouseUp () {
      const sent = this.brightness / 100
      this.gate.register(sent)
      this.gate.releaseInteraction()
      await appliancesService.setBrightness(this.app.id, 'light', sent)
    },
    mouseDown () {
      this.gate.holdForInteraction()
    },
    getBrightness (app) {
      if (app && app.state && app.state.dimmers && app.state.dimmers[0] && app.state.dimmers[0].brightness !== undefined) {
        this.brightness = app.state.dimmers[0].brightness * 100
      }
    }
  },

  mounted () {
    this.gate = new EchoGate({
      read: (app) => {
        const d = app && app.state && app.state.dimmers && app.state.dimmers[0]
        return d && d.brightness !== undefined ? d.brightness : null
      },
      matches: floatEchoMatcher(0.005),
      timeout: 3000,
      debugLabel: 'brightness'
    })
    this.unwatchFields = this.$watch(
      () => this.gate.read(this.app),
      () => {
        const released = this.gate.observe(this.app)
        if (released || !this.gate.isInFlight()) {
          this.getBrightness(this.app)
        }
      }
    )
    this.getBrightness(this.app)
    this.interval = setInterval(() => {
      if (this.gate.isInFlight()) {
        return
      }
      this.getBrightness(this.app)
    }, 500)
  },

  beforeDestroy () {
    if (this.unwatchFields) {
      this.unwatchFields()
      this.unwatchFields = null
    }
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    if (this.gate) {
      this.gate.destroy()
    }
  }
}
</script>
