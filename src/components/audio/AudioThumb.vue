<template>
  <span class="audio-thumb" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="imageUrl && !imageFailed" :src="imageUrl" loading="lazy" alt="" @error="imageFailed = true">
    <span
      v-else
      class="audio-thumb-placeholder"
      :style="{ backgroundColor: color, fontSize: `${Math.round(size * 0.4)}px` }"
    >{{ initials }}</span>
  </span>
</template>

<script lang="js">
import { initialsOf, placeholderColor } from '@/utils/audiobooks'

/**
 * A small square thumbnail in the audiobooks popup (openspec change
 * `kiosk-audiobooks-list`, D1): the cover, or the placeholder colour with the
 * entry's initials when there is no cover or it fails to load. Progress and the
 * played mark belong to the row, not to the thumbnail.
 */
export default {
  name: 'AudioThumb',

  props: {
    name: { type: String, required: true },
    imageUrl: { type: String, default: null },
    size: { type: Number, default: 40 }
  },

  data: () => ({
    imageFailed: false
  }),

  computed: {
    color () {
      return placeholderColor(this.name)
    },
    initials () {
      return initialsOf(this.name)
    }
  },

  watch: {
    imageUrl () {
      this.imageFailed = false
    }
  }
}
</script>

<style lang="scss">
.audio-thumb {
  position: relative;
  display: block;
  flex: 0 0 auto;
  border-radius: 4px;
  overflow: hidden;
  background-color: rgba(128, 128, 128, 0.15);

  img,
  .audio-thumb-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  img {
    object-fit: cover;
  }
}

.audio-thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.02em;
}
</style>
