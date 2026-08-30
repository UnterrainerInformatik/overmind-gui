<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex">
      <div class="d-flex flex-column">
        <KioskLinkPanel
          ref="backButton"
          :text="$t('page.kiosk.linkBack')"
          route="/app/kioskoverview"
        ></KioskLinkPanel>

        <KioskLinkPanel
          :text="$t('page.kiosk.linkPersonenVerwaltung')"
          route="/app/kioskpersonenverwaltung"
        ></KioskLinkPanel>
      </div>

      <KioskVideoStreamPanel :width="videoWidth" :height="videoHeight"
        :url="'https://frig.unterrainer.info/live/webrtc/api/ws?src=keller'"
        :overlayObjects="trackedPersons"
        :rtc="true"
      ></KioskVideoStreamPanel>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskVideoStreamPanel from '@/components/KioskVideoStreamPanel.vue'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import { singleton as frigateService } from '@/utils/webservices/frigateService'
import { Debouncer } from '@/utils/debouncer'

export default {
  name: 'kioskPersonen',

  components: {
    KioskVideoStreamPanel,
    KioskLinkPanel
  },

  data: () => ({
    interval: null,
    trackedPersons: [],
    debouncer: new Debouncer(),
    videoWidth: 640,
    videoHeight: 480
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    getBackButtonWidth () {
      const el = this.$refs.backButton && this.$refs.backButton.$el
      if (!el) {
        return 0
      }
      const style = window.getComputedStyle(el)
      const marginLeft = parseFloat(style.marginLeft) || 0
      const marginRight = parseFloat(style.marginRight) || 0
      return el.getBoundingClientRect().width + marginLeft + marginRight
    },

    updateVideoSize () {
      const margin = 32
      const aspect = 16 / 9
      const backButtonWidth = this.getBackButtonWidth()
      let width = window.innerWidth - margin - backButtonWidth
      let height = width / aspect
      if (height > window.innerHeight - margin) {
        height = window.innerHeight - margin
        width = height * aspect
      }
      this.videoWidth = Math.round(width)
      this.videoHeight = Math.round(height)
    },

    async getTrackedPersons () {
      try {
        this.trackedPersons = await frigateService.getTrackedPersons('keller')
      } catch (err) {
        // Frigate unreachable: keep the video playing without boxes rather than erroring.
      }
    },

    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  mounted () {
    this.kioskMode(true)
    this.$nextTick(() => this.updateVideoSize())
    window.addEventListener('resize', this.updateVideoSize)
    this.debouncer.debounce(async () => this.getTrackedPersons())
    this.interval = setInterval(() => this.debouncer.debounce(async () => this.getTrackedPersons()), 2000)
  },

  beforeDestroy () {
    window.removeEventListener('resize', this.updateVideoSize)
    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
