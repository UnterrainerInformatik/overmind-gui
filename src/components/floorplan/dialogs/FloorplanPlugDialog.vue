<template>
  <DebouncedOnOffButton v-if="showPowerButton(app)" ref="defaultActor" :item="item" :app="app"></DebouncedOnOffButton>
</template>

<script lang="js">
import DebouncedOnOffButton from '@/components/input/DebouncedOnOffButton.vue'

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
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    showPowerButton (app) {
      return app.switchable === undefined || app.switchable === null || app.switchable === 'TRUE' || app.switchable === 'DETAIL_ONLY'
    }
  }
}
</script>
