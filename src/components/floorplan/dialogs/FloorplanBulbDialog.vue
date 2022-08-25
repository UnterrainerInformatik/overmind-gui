<template>
  <div v-if="app && item">
    <br>
    <v-color-picker
      class="ml-16"
      v-if="value"
      :value="value"
      @update:color="changeColor"
      dot-size="31"
      mode="rgba"
      swatches-max-height="100"
      v-model="colorModel"
    ></v-color-picker>
    <br>
    <v-btn @click="toggle()" block height="42" :color="
            (app.state.relays[0].state === 'ON' ? 'on ' : 'off ') +
            ' darken-1'
          ">
      <v-icon>power_settings_new</v-icon>
    </v-btn>
    {{ colorModel }}
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
    pause: false,
    colorModel: null,
    value: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    async changeColor () {
      this.pause = true
      await this.setColors()
      this.pause = false
    },
    getColors (app) {
      if (app && app.state && app.state.rgbws && app.state.rgbws[0]) {
        const v = app.state.rgbws[0]
        return {
          r: v.red * 255,
          g: v.green * 255,
          b: v.blue * 255,
          a: v.gain
        }
      }
      return null
    },
    async setColors () {
      console.log('setColors')
      const v = this.colorModel.rgba
      await appliancesService.setColor(this.app.id, 'light', v.r / 255, v.g / 255, v.b / 255, v.a)
    },
    async toggle () {
      const actorPath = this.getActorPathOf(this.app, this.item.index)
      let st = this.app.onOffState
      if (Array.isArray(st)) {
        st = st[this.item.index]
      }
      if (st === 'on') {
        await appliancesService.turnOff(this.app.id, actorPath)
      }
      if (st === 'off') {
        await appliancesService.turnOn(this.app.id, actorPath)
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
    this.value = this.getColors(this.app)
    setInterval(() => {
      if (this.pause) {
        return
      }
      this.value = this.getColors(this.app)
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
