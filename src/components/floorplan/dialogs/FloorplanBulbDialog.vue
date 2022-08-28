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

    <DebouncedOnOffButton :item="item" :app="app"></DebouncedOnOffButton>
    tab: {{ tab }}<br />
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
          await this.$nextTick(async () => {
            const o = this.$refs.rgbwPicker
            if (!o) {
              return
            }
            this.pause = true
            await o.immediatelySetValues()
            this.waitForNextAppChange = true
            this.pause = false
          })
        }
        if (v === 1) {
          console.log('changed from c->bw')
          await this.$nextTick(async () => {
            const o = this.$refs.bwPicker
            if (!o) {
              console.log('cannot find picker')
              return
            }
            this.pause = true
            await o.immediatelySetValues()
            this.waitForNextAppChange = true
            this.pause = false
          })
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
