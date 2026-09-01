<template>
  <KioskPanel borderColor="secondary" bgColor="black" :min-width="width" :max-width="width" :pa="1" :renderTitle="false">
    <template>
      <VideoStreamRtc v-if="rtc" :width="width-8" :height="height-4" :wsUrl="url" :mode="mode" :photoEnabled="photoEnabled" :overlayObjects="overlayObjects"></VideoStreamRtc>
      <VideoStream v-else :width="width-8" :height="height-4" :url="url" :photoEnabled="photoEnabled" :overlayObjects="overlayObjects"></VideoStream>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import VideoStream from '@/components/VideoStream.vue'
import VideoStreamRtc from '@/components/VideoStreamRtc.vue'

export default {
  name: 'KioskVideoStreamPanel',

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
    },
    overlayObjects: {
      type: Array,
      default: () => []
    },
    rtc: {
      type: Boolean,
      default: false
    },
    /** the go2rtc transport, passed through to VideoStreamRtc */
    mode: {
      type: String,
      default: 'mse'
    }
  },

  components: {
    KioskPanel,
    VideoStream,
    VideoStreamRtc
  },

  data: () => ({
  }),

  computed: {
  },

  watch: {
  },

  methods: {
  },

  mounted () {
    // console.log('mounted')
  },

  beforeDestroy () {
    // console.log('beforeDestroy')
  }
}
</script>

<style lang="scss">
@import 'index.scss';

</style>
