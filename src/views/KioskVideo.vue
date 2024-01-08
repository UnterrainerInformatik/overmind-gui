<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>

      <KioskVideoStreamPanel :width="640" :height="480"
        :url="'https://frig.unterrainer.info/live/webrtc/api/stream.mp4?src=birdseye'"
      ></KioskVideoStreamPanel>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskVideoStreamPanel from '@/components/KioskVideoStreamPanel.vue'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'

export default {
  name: 'kioskVideo',

  components: {
    KioskVideoStreamPanel,
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

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
