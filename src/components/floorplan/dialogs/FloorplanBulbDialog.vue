<template>
  <div v-if="app && item">
    <v-card>
      <v-tabs background-color="primary" fixed-tabs v-model="tab">
        <v-tab>
          Farbe
        </v-tab>
        <v-tab>
          Weiß
        </v-tab>
      </v-tabs>
    </v-card>
    <br>
    <v-tabs-items v-model="tab">
      <v-tab-item>
        <DebouncedRgbwPicker ref="rgbwPicker" :item="item" :app="app" :disableWhite="true"></DebouncedRgbwPicker>
      </v-tab-item>
      <v-tab-item>
        <DebouncedBwPicker ref="bwPicker" :item="item" :app="app"></DebouncedBwPicker>
      </v-tab-item>
    </v-tabs-items>

    <DebouncedOnOffButton :item="item" :app="app"></DebouncedOnOffButton>
    tab: {{ tab }}<br>
    mode: {{ app.state.rgbws[0].mode }}
  </div>
</template>

<script lang="js">
import DebouncedRgbwPicker from '@/components/input/DebouncedRgbwPicker.vue'
import DebouncedBwPicker from '@/components/input/DebouncedBwPicker.vue'
import DebouncedOnOffButton from '@/components/input/DebouncedOnOffButton.vue'

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
    pause: false,
    waitForNextAppChange: false
  }),

  computed: {
  },

  watch: {
    app: {
      handler: function () {
        this.waitForNextAppChange = false
        this.changeTabBasedOnMode()
      },
      deep: true
    },
    tab: {
      handler: async function (v) {
        if (v === 0) {
          const o = this.$refs.rgbwPicker
          if (!o) {
            return
          }
          console.log('setting values of color on bulb')
          await o.immediatelySetValues()
        }
        if (v === 1) {
          const o = this.$refs.bwPicker
          if (!o) {
            return
          }
          console.log('setting values of white on bulb')
          await o.immediatelySetValues()
        }
      },
      deep: true
    }
  },

  methods: {
    changeTabBasedOnMode () {
      if (this.app && this.app.state && this.app.state.rgbws && this.app.state.rgbws[0] && this.app.state.rgbws[0].mode !== undefined) {
        if (this.app.state.rgbws[0].mode === 'WHITE') {
          if (this.tab !== 1) {
            if (this.pause || this.waitForNextAppChange) {
              return
            }
            this.tab = 1
          }
        } else {
          if (this.tab !== 0) {
            if (this.pause || this.waitForNextAppChange) {
              return
            }
            this.tab = 0
          }
        }
      }
    }
  }
}
</script>
