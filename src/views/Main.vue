<template>
  <div class="home">
    <v-container fluid>
      <v-alert color="success">success</v-alert>
      <v-alert color="info">info</v-alert>
      <v-alert color="warning">warning</v-alert>
      <v-alert color="error">error</v-alert>
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
    localeBackingField: '',
    raw: {},
    countAll: 0,
    loading: true
  }),

  watch: {
  },

  computed: {
    locale: {
      get () {
        return this.$i18n.locale
      },
      set (value) {
        this.localeBackingField = value
      }
    }
  },

  methods: {
  },

  mounted () {
    this.locale = this.$i18n.locale
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
