<template>
  <component v-bind:is="component"></component>
</template>

<script lang="js">
import TestTextField from '@/components/TestTextField.vue'
import TestLabel from '@/components/TestLabel.vue'

export default {
  name: 'TestFactory',

  props: {
    component: {},
    text: { default: 'testlabel' }
  },

  components: {
    TestTextField,
    TestLabel
  },

  data: () => ({
    TestTextField,
    TestLabel
  }),

  computed: {
  },

  watch: {
  },

  methods: {
  },

  mounted () {
    console.log('mounted')
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.middle {
  font-size: 15px;
  font-weight: normal;
  line-height: 20px;
}
.small {
  font-size: 10px;
  font-weight: normal;
  line-height: 10px;
}
.bold {
  font-weight: bold;
}
</style>
