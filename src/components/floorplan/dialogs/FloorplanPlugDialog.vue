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
    sub: null,
    unwatchSub: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    showPowerButton (app) {
      return app.switchable === undefined || app.switchable === null || app.switchable === 'TRUE' || app.switchable === 'DETAIL_ONLY'
    },
    applySubValues () {
      if (!this.sub || !this.sub.values || !this.app) {
        return
      }
      if (!this.app.state) {
        this.$set(this.app, 'state', {})
      }
      const prefix = `${this.app.id}:`
      for (const key of Object.keys(this.sub.values)) {
        if (!key.startsWith(prefix)) {
          continue
        }
        const v = this.sub.values[key]
        if (v === undefined) {
          continue
        }
        const path = key.slice(prefix.length)
        setPathValue(this.app.state, path, v)
      }
    }
  },

  mounted () {
    if (!this.app || !this.app.id) {
      return
    }
    this.sub = SseClient.getInstance().subscribe({
      minInterval: 300,
      selection: { perAppliance: [{ applianceId: this.app.id, paths: ['**'] }] }
    })
    this.unwatchSub = this.$watch(() => this.sub && this.sub.ts, () => this.applySubValues())
  },

  beforeDestroy () {
    if (this.unwatchSub) {
      this.unwatchSub()
      this.unwatchSub = null
    }
    if (this.sub) {
      this.sub.close()
      this.sub = null
    }
  }
}
</script>
