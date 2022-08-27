<template>
  <div v-if="app && item">
    <DebouncedColorPicker :item="item" :app="app"></DebouncedColorPicker>
    <DebouncedOnOffButton :item="item" :app="app"></DebouncedOnOffButton>
    <!--
    colorModel: {{ colorModel }}<br>
    pause: {{ pause }}<br>
    waitForNextAppChange: {{ waitForNextAppChange }}<br>
    -->
  </div>
</template>

<script lang="js">
import DebouncedColorPicker from '@/components/input/DebouncedColorPicker.vue'
import DebouncedOnOffButton from '@/components/input/DebouncedOnOffButton.vue'

export default {
  name: 'FloorplanDimmerDialog',

  props: {
    item: {},
    app: {}
  },

  components: {
    DebouncedColorPicker,
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
