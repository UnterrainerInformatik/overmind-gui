<template>
  <div v-if="app && item">
    <br>
    <DebouncedBrightnessSlider :item="item" :app="app"></DebouncedBrightnessSlider>
    <DebouncedOnOffButton :item="item" :app="app"></DebouncedOnOffButton>
  </div>
</template>

<script lang="js">
import DebouncedBrightnessSlider from '@/components/input/DebouncedBrightnessSlider.vue'
import DebouncedOnOffButton from '@/components/input/DebouncedOnOffButton.vue'

export default {
  name: 'FloorplanDimmerDialog',

  props: {
    item: {},
    app: {}
  },

  components: {
    DebouncedBrightnessSlider,
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
