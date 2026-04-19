<template>
  <DebouncedOnOffButton v-if="showPowerButton(app)" ref="defaultActor" :item="item" :app="app"></DebouncedOnOffButton>
</template>

<script lang="js">
import DebouncedOnOffButton from '@/components/input/DebouncedOnOffButton.vue'
import { SseClient } from '@/utils/sseClient'
import { setPathValue } from '@/utils/overmindUtils'

export default {
  name: 'FloorplanPlugDialog',

  props: {
    item: {},
    app: {}
  },

  components: {
    DebouncedOnOffButton
  },

  data: () => ({
    sseHandle: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    showPowerButton (app) {
      return app.switchable === undefined || app.switchable === null || app.switchable === 'TRUE' || app.switchable === 'DETAIL_ONLY'
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
