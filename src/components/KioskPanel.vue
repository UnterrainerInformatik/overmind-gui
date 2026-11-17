<template>
  <v-card
    outlined
    :class="[`ma-1 pa-${borderSize - 1} ${
      borderColor ? borderColor : (enabled ? 'on ' : 'off ') + 'darken-1'
    }`, { 'kiosk-panel--compact': compact }]"
    :style="borderColorRaw ? { borderColor: borderColorRaw + ' !important' } : {}"
    :max-width="maxWidth"
    :min-width="minWidth"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <v-card
      :class="'fill-height elevation-0 ma-0 noFocus ' + getBgColor(enabled)"
      :style="bgColorRaw ? { backgroundColor: bgColorRaw + ' !important' } : {}"
    >
      <v-card-text
        :class="`text-body-1 ${
          $vuetify.theme.dark ? 'grey--text' : 'black--text'
        } fill-height ${pa ? 'pa-' + pa : ''}`"
      >
        <div v-if="renderTitle" :class="['normal-text', compact ? 'kiosk-panel-title' : 'mb-4']">
          <slot name="title" v-bind:enabled="enabled"></slot>
        </div>
        <div :class="['normal-text', { 'kiosk-panel-text': compact }]"><slot v-bind:enabled="enabled"></slot></div
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
    borderColorRaw: null,
    bgColorRaw: null,
    minWidth: { default: '140px' },
    maxWidth: { default: '180px' },
    renderTitle: { default: true },
    borderSize: { default: 1 },
    pa: { default: null },
    // The overview's low variant: title slot beside the text, fixed height
    // (openspec change `kiosk-overview-room-for-audio-bar`, D1).
    compact: { type: Boolean, default: false }
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

// Fixed height so every tile of a row matches; a text longer than three lines
// is cut at the bottom edge instead of making the tile taller.
.v-card.kiosk-panel--compact {
  height: var(--kiosk-action-tile-height);
  overflow: hidden;

  .v-card__text {
    display: flex;
    align-items: center;
    overflow: hidden;
  }

  .kiosk-panel-title {
    flex: 0 0 auto;
    margin-right: 8px;
  }

  .kiosk-panel-text {
    flex: 1 1 auto;
    min-width: 0;
  }

  .normal-text {
    font-size: 16px !important;
    line-height: 17px !important;
  }
}
</style>
