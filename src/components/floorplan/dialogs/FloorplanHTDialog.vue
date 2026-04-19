<template>
  <div v-if="app && item">
    <v-text-field readonly dense outlined hide-details="true" class="ma-0 my-3 pa-0" label="Hat externen Strom:" :value="getExternalPower(app)"></v-text-field>
  </div>
</template>

<script lang="js">
import { SseClient } from '@/utils/sseClient'
import { setPathValue } from '@/utils/overmindUtils'

export default {
  name: 'FloorplanHTDialog',

  props: {
    item: {},
    app: {}
  },

  components: {
  },

  data: () => ({
    sseHandle: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    getExternalPower (app) {
      if (app && app.state && app.state.hasExternalPower) {
        return app.state.hasExternalPower ? 'Ja' : 'Nein'
      }
      return null
    },
    onTransportUpdate (payload) {
      if (!payload || !payload.values || !this.app) {
        return
      }
      if (!this.app.state) {
        this.$set(this.app, 'state', {})
      }
      for (const triple of payload.values) {
        if (triple.applianceId !== this.app.id && !(Array.isArray(triple.representsGroups) && triple.representsGroups.indexOf(this.app.id) !== -1)) {
          continue
        }
        setPathValue(this.app.state, triple.path, triple.value)
      }
    }
  },

  async mounted () {
    if (!this.app || !this.app.id) {
      return
    }
    this.sseHandle = await SseClient.getInstance().registerTransport({
      minInterval: 300,
      selection: { perAppliance: [{ applianceId: this.app.id, paths: ['**'] }] }
    }, (payload) => this.onTransportUpdate(payload))
  },

  beforeDestroy () {
    if (this.sseHandle) {
      SseClient.getInstance().unregisterTransport(this.sseHandle)
      this.sseHandle = null
    }
  }
}
</script>
