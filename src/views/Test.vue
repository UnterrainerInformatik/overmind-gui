<template>
  <div class="home">
    <TestFactory component="TestTextField" text="myLabel"></TestFactory>
    <TestFactory component="TestLabel" text="test"></TestFactory>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import TestFactory from '@/components/TestFactory.vue'

export default {
  name: 'test',

  components: {
    TestFactory
  },

  data: () => ({
  }),

  watch: {
  },

  computed: {
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
