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
        @start="mouseDown"
        @end="mouseUp"
      ></v-slider>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="2">
          <v-avatar x-small color="orange lighten-2"></v-avatar>
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
        @start="mouseDown"
        @end="mouseUp"
      ></v-slider>
        </v-col>
        <v-col cols="2">
          <v-avatar x-small color="blue lighten-3"></v-avatar>
        </v-col>
      </v-row>
    </v-sheet>
  </div>
</template>

<script lang="js">
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { EchoGate, floatEchoMatcher } from '@/utils/echoGate'

export default {
  name: 'DebouncedBwPicker',

  props: {
    item: {},
    app: {}
  },

  data: () => ({
    interval: null,
    brightness: undefined,
    temp: undefined,
    gate: null,
    unwatchFields: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    packValues () {
      return {
        brightness: this.brightness / 100,
        colorTemperature: this.temp / 100
      }
    },
    async mouseUp () {
      const v = this.packValues()
      this.gate.register(v)
      this.gate.releaseInteraction()
      await appliancesService.setWhite(this.app.id, 'light', v.brightness, v.colorTemperature)
    },
    mouseDown () {
      this.gate.holdForInteraction()
    },
    getValues (app) {
      if (app && app.state && app.state.rgbws && app.state.rgbws[0] && app.state.rgbws[0].brightness !== undefined) {
        this.brightness = app.state.rgbws[0].brightness * 100
      }
      if (app && app.state && app.state.rgbws && app.state.rgbws[0] && app.state.rgbws[0].colorTemperature !== undefined) {
        this.temp = app.state.rgbws[0].colorTemperature * 100
      }
    },
    async immediatelySetValues () {
      if (this.brightness !== undefined && this.temp !== undefined) {
        const v = this.packValues()
        this.gate.register(v)
        this.gate.releaseInteraction()
        await appliancesService.setWhite(this.app.id, 'light', v.brightness, v.colorTemperature)
      }
    }
  },

  mounted () {
    this.gate = new EchoGate({
      read: (app) => {
        const r = app && app.state && app.state.rgbws && app.state.rgbws[0]
        if (!r || r.brightness === undefined || r.colorTemperature === undefined) {
          return null
        }
        return { brightness: r.brightness, colorTemperature: r.colorTemperature }
      },
      matches: floatEchoMatcher(0.005),
      timeout: 3000,
      debugLabel: 'bwPicker'
    })
    this.unwatchFields = this.$watch(
      () => this.gate.read(this.app),
      () => {
        const released = this.gate.observe(this.app)
        if (released || !this.gate.isInFlight()) {
          this.getValues(this.app)
        }
      }
    )
    this.getValues(this.app)
    this.interval = setInterval(() => {
      if (this.gate.isInFlight()) {
        return
      }
      this.getValues(this.app)
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
