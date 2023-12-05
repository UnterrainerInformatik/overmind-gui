<template>
  <KioskPanel borderColor="secondary" bgColor="black" maxWidth="800">
    <template>
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

      <v-progress-circular
        v-if="isLoading"
        indeterminate
        color="primary"
      ></v-progress-circular>

      <div class="camera-shutter"></div>
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
      <canvas ref="canvas" hidden></canvas>
      <a
        hidden
        id="downloadPhoto"
        ref="downloadPhoto"
        download="my-photo.jpg"
        class="button"
        role="button"
      >
      </a>
      <div>
        <!-- http://admin:pamelaan@10.10.196.10/cgi/jpg/image.cgi -->
        <!-- http://admin:pamelaan@10.10.196.10:80/video/mjpg.cgi?resolution=VGA -->
        <video src="http://10.10.196.2:1984/stream.html?src=alex&mode=mjpeg" autoplay></video>
      </div>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'

export default {
  name: 'KioskVideoPanel',

  props: {
  },

  components: {
    KioskPanel
  },

  data: () => ({
    interval: null,
    availableVideoDevices: [],
    selectedVideoDeviceId: null,
    isVideoRunning: false,
    isLoading: false,
    link: '#',
    transformHoverIn: 'transform: scale(1.015); transform-origin: center, center; transition: transform 0.3s ease-in-out;',
    transformHoverOut: 'transition: transform 0.3s ease-in-out;',
    mjpgInterval: null,
    mjpgBackingImage: null,
    fetchInterval: null,
    fetchingBackingImage: null
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    startMjpgFetching (url, username, password) {
      const canvas = this.$refs.mjpg
      const FRAME_RATE = 30
      const u = url
      const base64Credentials = Buffer.from(`${username}:${password}`).toString('base64')

      const fetchImage = async () => {
        const response = await fetch(u, {
          headers: {
            Authorization: `Basic ${base64Credentials}`
          }
        })
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        this.fetchingBackingImage = new Image()
        const img = this.fetchingBackingImage
        img.onload = () => {
          URL.revokeObjectURL(url)
          canvas.width = img.width
          canvas.height = img.height
          const context = canvas.getContext('2d')
          context.clearRect(0, 0, canvas.width, canvas.height)
          context.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
        img.src = url
      }

      this.fetchInterval = setInterval(fetchImage, 1000 / FRAME_RATE)
    },
    startMjpg () {
      const canvas = this.$refs.mjpg
      this.mjpgBackingImage = new Image()

      // this.mjpgBackingImage.src = 'http://admin:pamelaan@10.10.196.10:80/video/mjpg.cgi?resolution=VGA'
      this.mjpgBackingImage.src = 'http://10.10.196.10:80/video/mjpg.cgi?resolution=VGA'

      const FRAME_RATE = 30

      this.mjpgBackingImage.onload = () => {
        canvas.width = this.mjpgBackingImage.width
        canvas.height = this.mjpgBackingImage.height

        this.mjpgInterval = setInterval(() => {
          const context = canvas.getContext('2d')
          // Clear the canvas before drawing each frame
          context.clearRect(0, 0, canvas.width, canvas.height)
          // Draw the image onto the canvas
          context.drawImage(this.mjpgBackingImage, 0, 0, canvas.width, canvas.height)
        }, 1000 / FRAME_RATE)
      }
    },
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
        console.log({ stream })
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
    }
  },

  mounted () {
    this.startMjpg()
    // this.startMjpgFetching('http://10.10.196.13:80/video/mjpg.cgi?resolution=VGA', 'admin', 'pamelaan')
    this.update()
    this.interval = setInterval(() => this.update(), 1000)
  },

  beforeDestroy () {
    if (this.interval) {
      clearInterval(this.interval)
    }
    if (this.mjpgInterval) {
      clearInterval(this.mjpgInterval)
    }
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval)
    }
  }
}
</script>

<style lang="scss">
@import 'index.scss';
</style>
