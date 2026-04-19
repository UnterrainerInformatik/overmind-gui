<template>
  <div v-if="app && item">
    <v-card>
      <v-tabs background-color="primary" fixed-tabs v-model="tab">
        <v-tab> Farbe </v-tab>
        <v-tab> Weiß </v-tab>
      </v-tabs>
    </v-card>
    <br />
    <v-tabs-items v-model="tab">
      <v-tab-item eager>
        <DebouncedRgbwPicker
          ref="rgbwPicker"
          :item="item"
          :app="app"
          :disableWhite="true"
        ></DebouncedRgbwPicker>
      </v-tab-item>
      <v-tab-item eager>
        <DebouncedBwPicker
          ref="bwPicker"
          :item="item"
          :app="app"
        ></DebouncedBwPicker>
      </v-tab-item>
    </v-tabs-items>

    <DebouncedOnOffButton ref="default" :item="item" :app="app"></DebouncedOnOffButton>
  </div>
</template>

<script lang="js">
import DebouncedRgbwPicker from '@/components/input/DebouncedRgbwPicker.vue'
import DebouncedBwPicker from '@/components/input/DebouncedBwPicker.vue'
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
    DebouncedRgbwPicker,
    DebouncedBwPicker,
    DebouncedOnOffButton
  },

  data: () => ({
    tab: null,
    unwatchMode: null,
    sseHandle: null
  }),

  computed: {
  },

  watch: {
    tab: {
      handler: async function (v) {
        if (v === 0) {
          await this.$nextTick(async () => {
            const o = this.$refs.rgbwPicker
            if (!o) {
              return
            }
            await o.immediatelySetValues()
          })
        }
        if (v === 1) {
          await this.$nextTick(async () => {
            const o = this.$refs.bwPicker
            if (!o) {
              return
            }
            await o.immediatelySetValues()
          })
        }
      }
    }
  },

  methods: {
    defaultAction () {
      this.$refs.default.toggle()
    },
    childInFlight () {
      const picker = this.tab === 0 ? this.$refs.rgbwPicker : this.$refs.bwPicker
      return !!(picker && picker.gate && picker.gate.isInFlight())
    },
    changeTabBasedOnMode () {
      if (this.childInFlight()) {
        return
      }
      if (this.app && this.app.state && this.app.state.rgbws && this.app.state.rgbws[0] && this.app.state.rgbws[0].mode !== undefined) {
        if (this.app.state.rgbws[0].mode === 'WHITE') {
          if (this.tab !== 1) {
            this.tab = 1
          }
        } else {
          if (this.tab !== 0) {
            this.tab = 0
          }
        }
      }
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
    this.unwatchMode = this.$watch(
      () => this.app && this.app.state && this.app.state.rgbws && this.app.state.rgbws[0] && this.app.state.rgbws[0].mode,
      () => this.changeTabBasedOnMode(),
      { immediate: true }
    )

    if (!this.app || !this.app.id) {
      return
    }
    this.sseHandle = await SseClient.getInstance().registerTransport({
      minInterval: 300,
      selection: { perAppliance: [{ applianceId: this.app.id, paths: ['**'] }] }
    }, (payload) => this.onTransportUpdate(payload))
  },

  beforeDestroy () {
    if (this.unwatchMode) {
      this.unwatchMode()
      this.unwatchMode = null
    }
    if (this.sseHandle) {
      SseClient.getInstance().unregisterTransport(this.sseHandle)
      this.sseHandle = null
    }
  }
}
</script>
