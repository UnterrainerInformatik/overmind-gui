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

export default {
  name: 'DebouncedBwPicker',

  props: {
    item: {},
    app: {}
  },

  data: () => ({
    brightness: undefined,
    temp: undefined,
    isDragging: false
  }),

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
    packValues () {
      return {
        brightness: this.brightness / 100,
        colorTemperature: this.temp / 100
      }
    },
    async mouseUp () {
      const v = this.packValues()
      await appliancesService.setWhite(this.app.id, 'light', v.brightness, v.colorTemperature)
      this.isDragging = false
    },
    mouseDown () {
      this.isDragging = true
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
        await appliancesService.setWhite(this.app.id, 'light', v.brightness, v.colorTemperature)
      }
    }
  },

  mounted () {
    this.getValues(this.app)
  }
}
</script>
