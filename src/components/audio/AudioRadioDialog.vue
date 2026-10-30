<template>
  <v-dialog
    :value="value"
    max-width="640"
    :fullscreen="$vuetify.breakpoint.xsOnly"
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card class="audio-radio-dialog">
      <v-card-title class="audio-dialog-title">
        <span>{{ $t('page.kiosk.audio.radio') }}</span>
        <v-spacer></v-spacer>
        <v-btn icon class="audio-dialog-close" :aria-label="$t('page.kiosk.audio.close')" @click="$emit('input', false)">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-progress-linear v-if="loading && stations.length === 0" indeterminate></v-progress-linear>
        <div v-else-if="failed" class="audio-radio-message">{{ $t('page.kiosk.audio.loadFailed') }}</div>
        <div v-else-if="stations.length === 0" class="audio-radio-message audio-radio-empty">{{ $t('page.kiosk.audio.noStations') }}</div>
        <div v-else class="audio-radio-grid">
          <button
            v-for="(station, index) in stations"
            :key="`s-${index}`"
            type="button"
            class="audio-radio-tile"
            :data-index="index"
            @click="play(station)"
          >
            <v-img v-if="station.imageUrl" :src="station.imageUrl" class="audio-radio-image" contain></v-img>
            <v-icon v-else large class="audio-radio-image">radio</v-icon>
            <span class="audio-radio-name">{{ station.name }}</span>
          </button>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="js">
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'

/**
 * The radio quick select (openspec change `kiosk-audio-bar`): up to eight
 * stations in the order the server sends them. A tap plays the station on the
 * bar's target and closes the dialog.
 */
export default {
  name: 'AudioRadioDialog',

  mixins: [audioCommand],

  props: {
    value: { type: Boolean, default: false },
    target: { type: Object, default: null }
  },

  data: () => ({
    stations: [],
    loading: false,
    failed: false
  }),

  watch: {
    value (open) {
      if (open) {
        this.load()
      }
    }
  },

  methods: {
    async load () {
      this.loading = true
      try {
        this.stations = await audioService.getRadio()
        this.failed = false
      } catch (err) {
        this.failed = true
      } finally {
        this.loading = false
      }
    },
    play (station) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      this.$emit('input', false)
      this.runAudioCommand(() => audioService.playMedia(targetId, station.uri))
    }
  }
}
</script>

<style lang="scss">
.audio-radio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.audio-radio-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  min-height: 110px;
  border: 1px solid rgba(128, 128, 128, 0.35);
  border-radius: 4px;
  color: inherit;

  .audio-radio-image {
    width: 64px;
    height: 64px;
    flex: 0 0 auto;
  }
}

.audio-radio-name {
  margin-top: 6px;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
