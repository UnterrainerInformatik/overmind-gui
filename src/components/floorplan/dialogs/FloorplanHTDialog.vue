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
    sub: null,
    unwatchSub: null
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
