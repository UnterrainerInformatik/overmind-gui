<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap">
      <v-row cols="12">
        <v-col cols="12">
          <v-select
            v-model="selectedVideoDeviceId"
            :items="availableVideoDevices"
            item-text="shortenedLabel"
            item-value="deviceId"
            label="Select a camera"
            @change="changeStream"
          ></v-select>
        </v-col>
      </v-row>
      <v-row>
        <KioskLinkPanel
          :text="$t('page.kiosk.linkBack')"
          route="/app/kioskoverview"
        ></KioskLinkPanel>

        <v-progress-circular
          v-if="isLoading"
          indeterminate
          color="primary"
        ></v-progress-circular>

        <v-hover>
          <template v-slot:default="{ hover }">
            <div>
              <video
                id="video"
                ref="video"
                autoplay
                :style="hover ? transformHoverIn : transformHoverOut"
              ></video>
              <canvas
                @click="takePhoto"
                class="video-overlay"
                :style="
                  `position: absolute;
                 top: ${$refs.video ? $refs.video.offsetTop : 0}px;
                 left: ${$refs.video ? $refs.video.offsetLeft : 0}px;
                 width: ${$refs.video ? $refs.video.videoWidth : 0}px;
                 height: ${$refs.video ? $refs.video.videoHeight : 0}px;
                 transition: background-color 0.3s ease-in-out;
              ` +
                  (hover
                    ? ' background-color: rgba(0, 100, 0, 0.2); ' +
                      transformHoverIn
                    : ' ' + transformHoverOut)
                "
              ></canvas>
            </div>
          </template>
        </v-hover>
      </v-row>
      <canvas ref="canvas" hidden></canvas>
      <a
        hidden
        id="downloadPhoto"
        ref="downloadPhoto"
        download="overmind-camera-still.jpg"
        class="button"
        role="button"
      >
      </a>
    </v-container>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'

export default {
  name: 'kioskCamera',

  components: {
    KioskLinkPanel
  },

  data: () => ({
    interval: null,
    availableVideoDevices: [],
    selectedVideoDeviceId: null,
    isVideoRunning: false,
    isLoading: false,
    transformHoverIn: 'transform: scale(1.015); transform-origin: center, center; transition: transform 0.3s ease-in-out;',
    transformHoverOut: 'transition: transform 0.3s ease-in-out;'
  }),

  watch: {
  },

  computed: {
  },

  methods: {
    async update () {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      // console.log({ videoDevices })
      videoDevices.forEach(device => {
        device.shortenedLabel = this.capStringToLength(device.label, 30)
      })
      this.availableVideoDevices = videoDevices
      if (this.selectedVideoDeviceId === null && videoDevices.length > 0) {
        this.selectedVideoDeviceId = videoDevices[0].deviceId
      }
      if (!this.isVideoRunning && videoDevices.length > 0) {
        this.startCameraStream()
      }
    },
    async changeStream () {
      await this.stopCameraStream()
      await this.startCameraStream()
    },
    capStringToLength (string, length) {
      if (length < 3) {
        throw new Error('Length must be at least 3')
      }
      if (string === null || string === undefined) {
        return ''
      }
      if (string.length > length) {
        return string.substring(0, length - 3) + '...'
      }
      return string
    },
    async startCameraStream () {
      this.isLoading = true
      const constraints = {
        video: {
          deviceId: this.selectedVideoDeviceId
        }
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        // console.log({ stream })
        this.$refs.video.srcObject = stream
        this.isLoading = false
        this.isVideoRunning = true
      } catch (e) {
        this.isLoading = false
        alert('There was an error opening your camera: ' + e)
      }
    },
    async stopCameraStream () {
      const tracks = this.$refs.video.srcObject.getTracks()
      console.log({ tracks })
      tracks.forEach(track => track.stop())
      this.isVideoRunning = false
    },
    async takePhoto () {
      const canvas = this.$refs.canvas
      const ctx = canvas.getContext('2d')
      const video = this.$refs.video
      const download = this.$refs.downloadPhoto

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(this.$refs.video, 0, 0, canvas.width, canvas.height)

      download.href = canvas.toDataURL(
        'image/jpeg'
      ).replace('image/jpeg', 'image/octet-stream')
      download.click()
    },
    downloadImage () {
      this.$refs.downloadPhoto.click()
    },
    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  mounted () {
    this.kioskMode(true)
    this.update()
    this.interval = setInterval(() => this.update(), 1000)
  },

  beforeDestroy () {
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
