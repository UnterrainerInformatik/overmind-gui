<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <KioskLinkPanel :text="$t('page.kiosk.linkBack')" route="/app/kioskoverview"></KioskLinkPanel>
      <v-img :src="require('@/assets/plan.png')"></v-img>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'

export default {
  name: 'kioskOverview',

  components: {
    KioskLinkPanel
  },

  data: () => ({
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  mounted () {
    this.kioskMode(true)
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
