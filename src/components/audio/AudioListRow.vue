<template>
  <button
    type="button"
    class="audio-list-row"
    :class="{ 'audio-list-row--compact': compact, 'audio-list-row--played': played }"
    :title="caption ? `${name} · ${caption}` : name"
    @click="$emit('click')"
  >
    <AudioThumb :name="name" :image-url="imageUrl" :size="40"></AudioThumb>
    <span class="audio-list-row-text">
      <span class="audio-list-row-name">{{ name }}</span>
      <span v-if="caption" class="audio-list-row-caption text-caption">{{ caption }}</span>
      <v-progress-linear
        v-if="progress > 0 && !played"
        class="audio-list-row-progress"
        :color="$vuetify.theme.dark ? '#fff' : 'primary'"
        :value="Math.round(progress * 100)"
        height="3"
      ></v-progress-linear>
    </span>
    <span v-if="!compact && (trailing || played)" class="audio-list-row-trailing">
      <span v-if="trailing" class="audio-list-row-duration text-caption">{{ trailing }}</span>
      <v-icon
        v-if="played"
        class="audio-list-row-played"
        color="green"
        small
        role="img"
        :aria-label="$t('page.kiosk.audio.books.played')"
      >check_circle</v-icon>
    </span>
  </button>
</template>

<script lang="js">
import AudioThumb from '@/components/audio/AudioThumb.vue'

/**
 * One entry of the audiobooks popup (openspec change `kiosk-audiobooks-list`,
 * D2/D3): a full-width button with a small thumbnail, the name, a caption
 * (authors, episode count or podcast name), a trailing duration and played
 * mark, and a thin progress bar for a started entry. `compact` is the
 * fixed-width card of the "Weiterhören" row, without the trailing column.
 */
export default {
  name: 'AudioListRow',

  components: { AudioThumb },

  props: {
    name: { type: String, required: true },
    caption: { type: String, default: null },
    imageUrl: { type: String, default: null },
    /** 0..1 */
    progress: { type: Number, default: 0 },
    played: { type: Boolean, default: false },
    /** e.g. the duration of a book */
    trailing: { type: String, default: null },
    compact: { type: Boolean, default: false }
  }
}
</script>

<style lang="scss">
.audio-list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 56px;
  min-width: 0;
  padding: 0 4px;
  text-align: left;
  color: inherit;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.theme--dark .audio-list-row {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.audio-list-row-text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.audio-list-row-name,
.audio-list-row-caption {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-list-row-name {
  font-size: 15px;
  line-height: 20px;
}

.audio-list-row-caption {
  line-height: 16px !important;
  opacity: 0.7;
}

.audio-list-row .audio-list-row-progress {
  margin-top: 4px;
  border-radius: 2px;
}

.audio-list-row-trailing {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.audio-list-row-duration {
  opacity: 0.7;
}

.audio-list-row--compact {
  padding: 0 10px 0 8px;
  border-bottom: none;
  border-radius: 6px;
  background-color: rgba(128, 128, 128, 0.15);

  .audio-list-row-name {
    font-size: 14px;
    line-height: 18px;
  }
}

.theme--dark .audio-list-row--compact {
  border-bottom: none;
}
</style>
