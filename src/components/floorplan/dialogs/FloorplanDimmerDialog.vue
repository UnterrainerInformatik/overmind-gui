<template>
  <div v-if="app && item">
    <br>
    <DebouncedBrightnessSlider :item="item" :app="app"></DebouncedBrightnessSlider>
    <DebouncedOnOffButton :item="item" :app="app"></DebouncedOnOffButton>
  </div>
</template>

<script lang="js">
import DebouncedBrightnessSlider from '@/components/input/DebouncedBrightnessSlider.vue'
import DebouncedOnOffButton from '@/components/input/DebouncedOnOffButton.vue'
import { SseClient } from '@/utils/sseClient'
import { setPathValue } from '@/utils/overmindUtils'

export default {
  name: 'FloorplanDimmerDialog',

  props: {
    item: {},
    app: {}
  },

  components: {
    DebouncedBrightnessSlider,
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
