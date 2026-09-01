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

        <KioskLinkPanel
          :text="$t('page.kiosk.linkPersonenEvents')"
          route="/app/kioskpersonenevents"
        ></KioskLinkPanel>

        <v-card v-if="cameras.length > 1" outlined class="ma-1 pa-2 personen-camera-switch">
          <v-select
            v-model="selectedCameraId"
            :items="cameraItems"
            :label="$t('page.kiosk.personen.camera')"
            dense
            outlined
            hide-details="auto"
          ></v-select>
        </v-card>
      </div>

      <v-card v-if="camerasError" outlined color="error" class="ma-1 pa-4 personen-state">
        <v-icon left color="white">warning</v-icon>
        {{ $t('page.kiosk.personen.registryError') }}
      </v-card>

      <v-card v-else-if="streamError" outlined color="error" class="ma-1 pa-4 personen-state">
        <v-icon left color="white">warning</v-icon>
        {{ $t('page.kiosk.personen.streamError', { name: selectedCameraName }) }}
      </v-card>

      <v-card v-else-if="!camerasLoading && cameras.length === 0" outlined class="ma-1 pa-4 personen-state">
        <div class="mb-2">{{ $t('page.kiosk.personen.noCamera') }}</div>
        <KioskLinkPanel
          :text="$t('page.kiosk.linkCameras')"
          route="/app/kioskcameras"
        ></KioskLinkPanel>
      </v-card>

      <KioskVideoStreamPanel
        v-else-if="streamHandle"
        :width="videoWidth"
        :height="videoHeight"
        :url="streamHandle.url"
        :mode="streamHandle.mode"
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
import { singleton as camerasService } from '@/utils/webservices/camerasService'
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
    videoHeight: 480,

    cameras: [],
    camerasLoading: true,
    camerasError: false,
    selectedCameraId: null,

    streamHandle: null,
    streamError: false
  }),

  watch: {
    /**
     * Switching camera drops the boxes of the previous one before the new
     * stream is even resolved: they belong to another picture, and leaving them
     * on screen would draw them over the new one until the next poll.
     */
    selectedCameraId () {
      this.trackedPersons = []
      this.streamHandle = null
      this.streamError = false
      this.loadStreamHandle()
      this.debouncer.debounce(async () => this.getTrackedPersons())
    }
  },

  computed: {
    cameraItems () {
      return this.cameras.map(camera => ({ value: camera.id, text: camera.displayName }))
    },

    selectedCameraName () {
      const camera = this.cameras.find(candidate => candidate.id === this.selectedCameraId)
      return camera ? camera.displayName : ''
    }
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

    /**
     * Which camera is shown here is a setting in the registry, not a constant:
     * the page takes the cameras flagged for the live page, in the configured
     * order, and shows the first one.
     */
    async loadCameras () {
      this.camerasLoading = true
      this.camerasError = false
      try {
        this.cameras = await camerasService.getCamerasForLivePage()
      } catch (err) {
        this.camerasError = true
        this.cameras = []
      }
      this.camerasLoading = false
      if (this.cameras.length) {
        this.selectedCameraId = this.cameras[0].id
      }
    },

    async loadStreamHandle () {
      if (this.selectedCameraId === null) {
        return
      }
      const cameraId = this.selectedCameraId
      this.streamError = false
      try {
        const handle = await frigateService.getStreamHandle(cameraId)
        // a switch while this was in flight must not attach the old stream
        if (cameraId !== this.selectedCameraId) {
          return
        }
        this.streamHandle = handle
      } catch (err) {
        if (cameraId === this.selectedCameraId) {
          this.streamError = true
        }
      }
    },

    async getTrackedPersons () {
      if (this.selectedCameraId === null) {
        return
      }
      const cameraId = this.selectedCameraId
      try {
        const persons = await frigateService.getTrackedPersons(cameraId)
        if (cameraId !== this.selectedCameraId) {
          return
        }
        this.trackedPersons = persons
      } catch (err) {
        // Detection source unreachable: keep the video playing without boxes
        // rather than erroring.
      }
    },

    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  async mounted () {
    this.kioskMode(true)
    this.$nextTick(() => this.updateVideoSize())
    window.addEventListener('resize', this.updateVideoSize)
    await this.loadCameras()
    // Selecting the first camera fires the watcher, which resolves the stream
    // and reads the boxes once; only the repeat is set up here.
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

.personen-camera-switch {
  max-width: 220px;
}

.personen-state {
  align-self: flex-start;
  max-width: 520px;
}
</style>
