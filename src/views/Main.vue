<template>
  <div class="home">
    <v-container fluid>

    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src

export default {
  name: 'Main',

  components: {
  },

  data: () => ({
    raw: {},
    countAll: 0,
    loading: true
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
</style>
