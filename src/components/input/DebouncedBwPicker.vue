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
        @mouseup="mouseUp"
        @mousedown="mouseDown"
      ></v-slider>
        </v-col>
        <v-col cols="2">
          <v-avatar x-small color="blue lighten-3"></v-avatar>
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
    interval: null,
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
    getValues (app) {
      if (app && app.state && app.state.rgbws && app.state.rgbws[0] && app.state.rgbws[0].brightness !== undefined) {
        this.brightness = app.state.rgbws[0].brightness * 100
      }
      if (app && app.state && app.state.rgbws && app.state.rgbws[0] && app.state.rgbws[0].colorTemperature !== undefined) {
        this.temp = app.state.rgbws[0].colorTemperature * 100
      }
    },
    async immediatelySetValues () {
      console.log('trying to send values')
      if (this.brightness !== undefined && this.temp !== undefined) {
        console.log('sending values...')
        await appliancesService.setWhite(this.app.id, 'light', this.brightness / 100, this.temp / 100)
        console.log('sent bw:', this.brightness, this.temp)
      }
    }
  },

  mounted () {
    this.getValues(this.app)
    this.interval = setInterval(() => {
      if (this.pause || this.waitForNextAppChange) {
        return
      }
      this.getValues(this.app)
    }, 500)
  },

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}
</script>
