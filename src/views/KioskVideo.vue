<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>

      <VideoStream
        :url="'http://babylon5.unterrainer.info:5000/live/webrtc/api/stream.mp4?src=alex&video=h264,h265&audio=aac,opus,mp3,pcma,pcmu'"
      ></VideoStream>
      <VideoStream
        :url="'http://babylon5.unterrainer.info:5000/live/webrtc/api/stream.mp4?src=stefan&video=h264,h265&audio=aac,opus,mp3,pcma,pcmu'"
      ></VideoStream>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import VideoStream from '@/components/VideoStream.vue'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'

export default {
  name: 'kioskVideo',

  components: {
    VideoStream,
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
