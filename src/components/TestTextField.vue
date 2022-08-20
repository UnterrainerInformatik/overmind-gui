<template>
  <v-text-field dense outlined hide-details="true" :label="text"></v-text-field>
</template>

<script lang="js">

export default {
  name: 'TestTextField',

  props: {
    text: { default: 'testfield' }
  },

  components: {
  },

  data: () => ({
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
