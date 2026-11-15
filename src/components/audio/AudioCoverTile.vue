<template>
  <button
    type="button"
    class="audio-cover-tile"
    :class="{ 'audio-cover-tile--played': played }"
    :title="author ? `${name} · ${author}` : name"
    @click="$emit('click')"
  >
    <span class="audio-cover-tile-image">
      <img v-if="imageUrl && !imageFailed" :src="imageUrl" loading="lazy" alt="" @error="imageFailed = true">
      <span v-else class="audio-cover-tile-placeholder" :style="{ backgroundColor: color }">
        <span class="audio-cover-tile-placeholder-name">{{ name }}</span>
        <span v-if="author" class="audio-cover-tile-placeholder-author">{{ author }}</span>
      </span>
      <span v-if="played" class="audio-cover-tile-played" :aria-label="$t('page.kiosk.audio.books.played')">
        <v-icon small dark>check</v-icon>
      </span>
      <span v-if="progress > 0 && !played" class="audio-cover-tile-progress">
        <span class="audio-cover-tile-progress-bar" :style="{ width: `${Math.round(progress * 100)}%` }"></span>
      </span>
    </span>
    <span class="audio-cover-tile-name">{{ name }}</span>
    <span v-if="author" class="audio-cover-tile-author text-caption">{{ author }}</span>
  </button>
</template>

<script lang="js">
import { placeholderColor } from '@/utils/audiobooks'

/**
 * One cover in the audiobooks popup (openspec change `kiosk-audiobooks`,
 * designs D4/D5): the cover or a coloured placeholder with name and author,
 * a progress bar for a started entry and a mark for a fully played one.
 */
export default {
  name: 'AudioCoverTile',

  props: {
    name: { type: String, required: true },
    author: { type: String, default: null },
    imageUrl: { type: String, default: null },
    /** 0..1 */
    progress: { type: Number, default: 0 },
    played: { type: Boolean, default: false }
  },

  data: () => ({
    imageFailed: false
  }),

  computed: {
    color () {
      return placeholderColor(this.name)
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
.audio-cover-tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  padding: 0;
  text-align: left;
  color: inherit;
  background: none;
  border: none;
}

.audio-cover-tile-image {
  position: relative;
  display: block;
  width: 100%;
  padding-top: 100%;
  border-radius: 4px;
  overflow: hidden;
  background-color: rgba(128, 128, 128, 0.15);

  img,
  .audio-cover-tile-placeholder {
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

.audio-cover-tile-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px;
  color: #fff;
  overflow: hidden;
  word-break: break-word;
}

.audio-cover-tile-placeholder-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.audio-cover-tile-placeholder-author {
  margin-top: 4px;
  font-size: 11px;
  line-height: 14px;
  opacity: 0.85;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.audio-cover-tile-played {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: rgba(46, 125, 50, 0.95);
}

.audio-cover-tile-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.45);
}

.audio-cover-tile-progress-bar {
  display: block;
  height: 100%;
  background-color: var(--v-primary-base, #1976d2);
}

.audio-cover-tile-name,
.audio-cover-tile-author {
  display: block;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-cover-tile-name {
  font-size: 13px;
  line-height: 16px;
}

.audio-cover-tile-author {
  margin-top: 0;
  opacity: 0.7;
}
</style>
