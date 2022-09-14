<template>
  <DebouncedOnOffButton ref="defaultActor" :item="item" :app="app"></DebouncedOnOffButton>
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
  }
}
</script>
