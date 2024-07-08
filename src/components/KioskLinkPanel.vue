<template>
  <KioskPanel
    class="noFocus"
    borderColor="disabled"
    bgColor="disabled darken-4"
    pa="1"
    :to="route"
  >
    <template v-slot:title>
      <v-avatar
        color="disabled darken-2"
        size="38"
      >
        <v-icon>link</v-icon>
      </v-avatar>
    </template>
    <template>
      {{ text }}
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'

export default {
  name: 'KioskLinkPanel',

  props: {
    text: {},
    route: {}
  },

  components: {
    KioskPanel
  },

  data: () => ({
  }),

  computed: {
  },

  watch: {
  },

  methods: {
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
