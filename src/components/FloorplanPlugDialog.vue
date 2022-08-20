<template>
  <div v-if="app && item">
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
  name: 'TestLabel',

  props: {
    item: {},
    app: {}
  },

  components: {
  },

  data: () => ({
  }),

  computed: {
  },

  watch: {
  },

  methods: {
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
    console.log('mounted')
  }
}
</script>

<style lang="scss">
@import 'index.scss';

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
