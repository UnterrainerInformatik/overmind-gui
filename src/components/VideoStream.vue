<template>
  <div>
    <v-hover>
      <template v-slot:default="{ hover }">
        <v-card :color="isLoading ? 'grey darken-3' : 'transparent'" :width="width" :height="height">
          <v-progress-circular
            :style="'top: 50%; left: 50%; transform: translate(-50%, -50%);'"
            v-if="isLoading"
            indeterminate
            color="grey"
          ></v-progress-circular>
          <video
            v-bind="$attrs"
            v-on="$listeners"
            v-show="!isLoading"
            :width="width"
            :height="height"
            ref="video"
            :src="url"
            type="video/mp4"
            crossorigin="anonymous"
            autoplay
            :style="hover ? transformHoverIn : transformHoverOut"
          ></video>
          <canvas
            @click="takePhoto"
            v-if="!isLoading"
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
                ? ' background-color: rgba(0, 100, 0, 0.2); ' + transformHoverIn
                : ' ' + transformHoverOut)
            "
          ></canvas>
        </v-card>
      </template>
    </v-hover>
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

export default {
  name: 'VideoStream',

  props: {
    url: {
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
    }
  },

  components: {
  },

  data: () => ({
    interval: null,
    isLoading: true,
    transformHoverOut: 'transition: transform 0.3s ease-in-out;'
  }),

  computed: {
    transformHoverIn () {
      return `transform: scale(${(this.width + 4) / this.width}); transform-origin: center, center; transition: transform 0.3s ease-in-out;`
    },
    size () {
      if (this.width === undefined || this.width === null || this.height === undefined || this.height === null) {
        return undefined
      }
      const width = parseInt(this.width.replace(/\D/g, ''), 10)
      const height = parseInt(this.height.replace(/\D/g, ''), 10)
      return Math.min(width, height) + 'px'
    }
  },

  watch: {
  },

  methods: {
    update () {
      const video = this.$refs.video
      if (!video) {
        return
      }
      // console.log(video.readyState)
      if (video.readyState > 2) {
        this.$emit('ready')
        this.isLoading = false
      }
    },
    async takePhoto () {
      if (!this.photoEnabled) {
        return
      }
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
    // console.log('VideoStream mounted')
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
