<template>
  <div v-if="app && item">
    <br>
    <v-slider v-if="brightness" class="mb-4" v-model="brightness" color="on" thumb-color="on" thumb-label="always" @mouseup="mouseUp" @mousedown="mouseDown"></v-slider>
    <v-btn @click="toggle()" block height="42" :color="
            (app.state.relays[0].state === 'ON' ? 'on ' : 'off ') +
            ' darken-1'
          ">
      <v-icon>power_settings_new</v-icon>
    </v-btn>
  </div>
</template>

<script lang="js">
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
    brightness: null,
    pause: false
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    mouseUp () {
      this.setBrightness()
      this.pause = false
    },
    mouseDown () {
      this.pause = true
    },
    getBrightness (app) {
      if (app && app.state && app.state.dimmers && app.state.dimmers[0] && app.state.dimmers[0].brightness !== undefined) {
        return app.state.dimmers[0].brightness * 100
      }
      return null
    },
    setBrightness () {
      appliancesService.setBrightness(this.app.id, 'light', this.brightness / 100)
    },
    toggle () {
      const actorPath = this.getActorPathOf(this.app, this.item.index)
      let st = this.app.onOffState
      if (Array.isArray(st)) {
        st = st[this.item.index]
      }
      if (st === 'on') {
        appliancesService.turnOff(this.app.id, actorPath)
      }
      if (st === 'off') {
        appliancesService.turnOn(this.app.id, actorPath)
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
    this.brightness = this.getBrightness(this.app)
    setInterval(() => {
      if (this.pause) {
        return
      }
      this.brightness = this.getBrightness(this.app)
    }, 500)
  }
}
</script>

<style lang="scss">
@import '../../index.scss';

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
