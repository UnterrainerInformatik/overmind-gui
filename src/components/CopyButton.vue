<template>
  <v-btn :color="color" @click.stop.prevent="copyToClipboard()" fab x-small>
    <v-icon>content_copy</v-icon>
  </v-btn>
</template>

<style lang="scss">
@import 'index.scss';
</style>

<script lang="js">
import { singleton as log } from '@/utils/loggingUtils'

export default {
  name: 'CopyButton',

  props: ['hiddenTextFieldSelector', 'color', 'value'],

  data: () => ({
  }),

  computed: {
  },

  watch: {
  },

  methods: {
    copyToClipboard () {
      const copyField = document.querySelector(this.hiddenTextFieldSelector)
      copyField.setAttribute('type', 'text')
      copyField.value = this.value
      copyField.select()

      try {
        document.execCommand('copy')
        log.success('\'' + this.value + '\'', 'copyPaste')
      } catch (err) {
        log.error('\'' + this.value + '\'', 'copyPaste')
      }

      // Unselect the range.
      copyField.setAttribute('type', 'hidden')
      window.getSelection().removeAllRanges()
    }
  }

}
</script>
