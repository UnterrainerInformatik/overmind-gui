<template>
  <KioskPanel borderColor="secondary" bgColor="black" :min-width="width" :pa="1" :renderTitle="false">
    <template>
      <VideoStream :width="width-8" :height="height-4" :url="url" :photoEnabled="photoEnabled"></VideoStream>
    </template>
  </KioskPanel>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import KioskPanel from '@/components/KioskPanel.vue'
import VideoStream from '@/components/VideoStream.vue'

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
      type: String
    },
    height: {
      type: String
    }
  },

  components: {
    KioskPanel,
    VideoStream
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
