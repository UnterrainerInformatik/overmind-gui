<template>
  <div>
    <v-card :color="isLoading ? 'grey darken-3' : 'transparent'" :width="width" :height="height">
      <v-progress-circular
        :style="'top: 50%; left: 50%; transform: translate(-50%, -50%);'"
        v-if="isLoading"
        indeterminate
        color="grey"
      ></v-progress-circular>
      <go2rtc-video
        ref="rtc"
        v-show="!isLoading"
        :style="`width: ${width}px; height: ${height}px; display: block;`"
      ></go2rtc-video>
      <canvas
        @click="takePhoto"
        v-if="!isLoading"
        ref="overlay"
        class="video-overlay"
        :style="
          `position: absolute;
             top: ${overlayRect.top}px;
             left: ${overlayRect.left}px;
             width: ${overlayRect.width}px;
             height: ${overlayRect.height}px;
             cursor: ${photoEnabled ? 'pointer' : 'default'};
          `
        "
      ></canvas>
    </v-card>
    <canvas ref="canvas" hidden></canvas>
    <a
      hidden
      id="downloadPhoto"
      ref="downloadPhoto"
      download="overmind-video-still.jpg"
      class="button"
      role="button"
    >
    </a>
  </div>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { VideoRTC } from '@/utils/video-rtc.js'

if (!customElements.get('go2rtc-video')) {
  customElements.define('go2rtc-video', VideoRTC)
}

export default {
  name: 'VideoStreamRtc',

  props: {
    wsUrl: {
      type: String,
      default: ''
    },
    photoEnabled: {
      type: Boolean,
      default: true
    },
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    overlayObjects: {
      type: Array,
      default: () => []
    }
  },

  components: {
  },

  data: () => ({
    interval: null,
    isLoading: true,
    videoEl: null,
    overlayRect: { top: 0, left: 0, width: 0, height: 0 }
  }),

  watch: {
  },

  methods: {
    update () {
      const video = this.videoEl
      if (!video) {
        return
      }
      if (video.readyState > 2) {
        this.$emit('ready')
        this.isLoading = false
      }
      this.updateOverlayRect(video)
      this.drawOverlay()
    },
    updateOverlayRect (video) {
      const { offsetTop: top, offsetLeft: left, offsetWidth: width, offsetHeight: height } = video
      const rect = this.overlayRect
      if (rect.top !== top || rect.left !== left || rect.width !== width || rect.height !== height) {
        this.overlayRect = { top, left, width, height }
      }
    },
    drawOverlay () {
      const canvas = this.$refs.overlay
      const video = this.videoEl
      if (!canvas || !video || !video.videoWidth || !video.videoHeight) {
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Canvas raster is sized to the stream's native resolution, which can be much
      // higher than its on-screen (CSS) size, so pixel constants below (font size,
      // line width, ...) are scaled up to stay a constant on-screen size.
      const scale = video.offsetWidth ? canvas.width / video.offsetWidth : 1
      this.overlayObjects.forEach(object => this.drawOverlayObject(ctx, canvas, object, scale))
    },
    drawOverlayObject (ctx, canvas, object, scale) {
      const [x, y, w, h] = object.data.box
      const boxX = x * canvas.width
      const boxY = y * canvas.height
      const boxWidth = w * canvas.width
      const boxHeight = h * canvas.height

      ctx.strokeStyle = '#00e676'
      ctx.lineWidth = 2 * scale
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)

      const label = this.overlayLabel(object)
      const fontSize = 16 * scale
      const pad = 4 * scale
      const barHeight = 20 * scale
      ctx.font = `${fontSize}px sans-serif`
      const textWidth = ctx.measureText(label).width
      const labelY = boxY > barHeight ? boxY - pad : boxY + fontSize
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(boxX, labelY - fontSize, textWidth + 2 * pad, barHeight)
      ctx.fillStyle = '#00e676'
      ctx.fillText(label, boxX + pad, labelY)
    },
    overlayLabel (object) {
      const name = object.sub_label || '?'
      const parts = [`${name} ${Math.round(object.data.score * 100)}%`]
      if (object.sub_label && object.data.sub_label_score !== null && object.data.sub_label_score !== undefined) {
        parts.push(`${Math.round(object.data.sub_label_score * 100)}%`)
      }
      let label = parts.join(' / ')
      if (object.zones && object.zones.length > 0) {
        label += ` · ${object.zones.join(', ')}`
      }
      return label
    },
    async takePhoto () {
      if (!this.photoEnabled) {
        return
      }
      const canvas = this.$refs.canvas
      const ctx = canvas.getContext('2d')
      const video = this.videoEl
      const download = this.$refs.downloadPhoto

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

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
    this.$nextTick(() => {
      const rtc = this.$refs.rtc
      this.videoEl = rtc.video
      rtc.video.controls = false
      rtc.src = this.wsUrl
    })
    this.interval = setInterval(() => this.update(), 100)
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
</style>
