<template>
  <v-card
    outlined
    :class="`ma-1 pa-${borderSize - 1} ${
      borderColor ? borderColor : (enabled ? 'on ' : 'off ') + 'darken-1'
    }`"
    :max-width="maxWidth"
    :min-width="minWidth"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <v-card
      :class="'fill-height elevation-0 ma-0 noFocus ' + getBgColor(enabled)"
    >
      <v-card-text
        :class="`text-body-1 ${
          $vuetify.theme.dark ? 'grey--text' : 'black--text'
        } fill-height ${pa ? 'pa-' + pa : ''}`"
      >
        <div v-if="renderTitle" class="mb-4 normal-text">
          <slot name="title" v-bind:enabled="enabled"></slot>
        </div>
        <div class="normal-text"><slot v-bind:enabled="enabled"></slot></div
      ></v-card-text>
    </v-card>
  </v-card>
</template>

<script lang="js">

export default {
  name: 'KioskPanel',

  props: {
    isEnabled: {},
    borderColor: {},
    bgColor: {},
    minWidth: { default: '140px' },
    maxWidth: { default: '180px' },
    renderTitle: { default: true },
    borderSize: { default: 1 },
    pa: { default: null }
  },

  data: () => ({
    interval: null,
    enabled: false
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    getBgColor (enabled) {
      if (this.bgColor) {
        return this.bgColor
      }

      let c = 'off'
      if (enabled) {
        c = 'on'
      }
      if (this.isEnabled == null || this.isEnabled === undefined) {
        c = 'disabled'
        if (this.$vuetify.theme.dark) {
          c += ' darken-4'
        }
      } else {
        if (this.$vuetify.theme.dark) {
          c += ' darken-4'
        } else {
          c += ' lighten-1'
        }
      }
      return c
    },
    calculateEnabledState () {
      if (typeof this.isEnabled !== 'function') {
        return
      }
      this.isEnabled().then((result) => {
        this.enabled = result
      })
    }
  },

  mounted () {
    this.interval = setInterval(() => this.calculateEnabledState(), 500)
  },

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.normal-text {
  font-size: 18px !important;
  line-height: 18px !important;
}

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
