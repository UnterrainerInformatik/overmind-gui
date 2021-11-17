<template>
  <v-hover v-if="enabled !== null" v-slot="{ hover }">
    <v-card
      outlined
      :class="
        'ma-1 pa-0 ' +
        (borderColor
          ? borderColor
          : (enabled ? 'error ' : 'success ') + (hover ? '' : 'darken-1'))
      "
      max-width="180px"
    >
      <v-card
        :class="
          'fill-height elevation-0 ma-0 noFocus' +
          ($vuetify.theme.dark
            ? ' grey darken-' + (hover ? '3' : '4')
            : ' grey lighten-' + (hover ? '2' : '1'))
        "
      >
        <v-card-title
          ><slot
            name="title"
            v-bind:enabled="enabled"
            v-bind:hover="hover"
          ></slot
        ></v-card-title>
        <v-card-text :class="$vuetify.theme.dark ? 'grey--text' : 'black--text'"
          ><slot v-bind:enabled="enabled" v-bind:hover="hover"></slot
        ></v-card-text>
      </v-card>
    </v-card>
  </v-hover>
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
