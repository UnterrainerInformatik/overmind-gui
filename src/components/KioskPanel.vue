<template>
    <v-card
      outlined
      :class="
        'ma-1 pa-0 ' +
        (borderColor
          ? borderColor
          : (enabled ? 'on ' : 'off ') + 'darken-1')
      "
      max-width="180px"
      v-bind="$attrs"
      v-on="$listeners"
    >
      <v-card :class="'fill-height elevation-0 ma-0 noFocus ' + getBgColor(enabled)">
        <v-card-title
          ><slot
            name="title"
            v-bind:enabled="enabled"
          ></slot
        ></v-card-title>
        <v-card-text :class="$vuetify.theme.dark ? 'grey--text' : 'black--text'"
          ><slot v-bind:enabled="enabled"></slot
        ></v-card-text>
      </v-card>
    </v-card>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">

export default {
  name: 'KioskPanel',

  props: {
    isEnabled: {},
    borderColor: {}
  },

  data: () => ({
    enabled: false
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    getBgColor (enabled) {
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
    setInterval(() => this.calculateEnabledState(), 1000)
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
