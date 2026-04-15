<template>
  <div v-if="app && item">
    <v-btn
      @click="toggle()"
      block
      height="42"
      :color="
        (app.state.relays[0].state === 'ON' ? 'on ' : 'off ') + ' darken-1'
      "
      :disabled="gate && gate.isInFlight()"
    >
      <v-icon>power_settings_new</v-icon>
    </v-btn>
  </div>
</template>

<script lang="js">
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { EchoGate } from '@/utils/echoGate'

export default {
  name: 'DebouncedOnOffButton',

  props: {
    item: {},
    app: {}
  },

  data: () => ({
    gate: null,
    unwatchFields: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    async toggle () {
      const actorPath = this.getActorPathOf(this.app, this.item.index)
      let st = this.app.onOffState
      if (Array.isArray(st)) {
        st = st[this.item.index]
      }
      const target = st === 'on' ? 'OFF' : 'ON'
      this.gate.register(target)
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
    },
    relayIndexFor (app, item) {
      if (app && app.type === 'RELAY_DUAL' && item && item.index !== undefined) {
        return item.index
      }
      return 0
    }
  },

  mounted () {
    const idx = this.relayIndexFor(this.app, this.item)
    this.gate = new EchoGate({
      read: (app) => {
        const r = app && app.state && app.state.relays && app.state.relays[idx]
        return r && r.state !== undefined ? r.state : null
      },
      matches: (sent, incoming) => sent === incoming,
      timeout: 3000,
      debugLabel: 'onOff[' + idx + ']'
    })
    this.unwatchFields = this.$watch(
      () => this.gate.read(this.app),
      () => { this.gate.observe(this.app) }
    )
  },

  beforeDestroy () {
    if (this.unwatchFields) {
      this.unwatchFields()
      this.unwatchFields = null
    }
    if (this.gate) {
      this.gate.destroy()
    }
  }
}
</script>

<style lang="scss">
@import '../index.scss';

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
