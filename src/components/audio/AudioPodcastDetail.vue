<template>
  <div class="audio-podcast-detail">
    <div class="text-overline">{{ $t('page.kiosk.audio.books.episodes') }}</div>
    <v-progress-linear v-if="loading && !loaded" indeterminate class="audio-podcast-loading"></v-progress-linear>
    <div v-else-if="failed && !loaded" class="audio-books-message audio-podcast-failed">{{ $t('page.kiosk.audio.loadFailed') }}</div>
    <div v-else-if="episodes.length === 0" class="audio-books-message audio-podcast-empty">{{ $t('page.kiosk.audio.books.empty') }}</div>
    <div v-else class="audio-podcast-episodes">
      <div
        v-for="episode in episodes"
        :key="`e-${episode.uri}`"
        class="audio-podcast-episode"
        :class="{ 'audio-podcast-episode--played': episode.fullyPlayed, 'audio-podcast-episode--started': isInProgress(episode) }"
        :data-uri="episode.uri"
      >
        <button type="button" class="audio-podcast-episode-main" :disabled="!target" @click="tap(episode)">
          <v-icon class="audio-podcast-episode-icon">{{ episode.fullyPlayed ? 'check_circle' : 'play_circle_outline' }}</v-icon>
          <span class="audio-podcast-episode-text">
            <span class="audio-podcast-episode-name">{{ episode.name }}</span>
            <span class="audio-podcast-episode-facts text-caption">
              <span v-if="episode.duration">{{ clockText(episode.duration) }}</span>
              <span v-if="episode.fullyPlayed"> · {{ $t('page.kiosk.audio.books.played') }}</span>
              <span v-else-if="isInProgress(episode) && episode.duration"> · {{ $t('page.kiosk.audio.books.remaining', { time: clockText(episode.duration - episode.resumePosition) }) }}</span>
            </span>
            <v-progress-linear
              v-if="isInProgress(episode)"
              class="audio-podcast-episode-progress mt-1"
              :color="$vuetify.theme.dark ? '#fff' : 'primary'"
              :value="Math.round(progressOf(episode) * 100)"
              height="3"
            ></v-progress-linear>
          </span>
        </button>
        <v-menu offset-y left>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon class="audio-podcast-episode-menu" :aria-label="$t('page.kiosk.audio.books.more')" :title="$t('page.kiosk.audio.books.more')" v-bind="attrs" v-on="on">
              <v-icon>more_vert</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item class="audio-podcast-episode-restart" :disabled="!target" @click="play(episode, 0)">
              <v-list-item-title>{{ $t('page.kiosk.audio.books.restart') }}</v-list-item-title>
            </v-list-item>
            <v-list-item class="audio-podcast-episode-mark-played" @click="markPlayed(episode, true)">
              <v-list-item-title>{{ $t('page.kiosk.audio.books.markPlayed') }}</v-list-item-title>
            </v-list-item>
            <v-list-item class="audio-podcast-episode-mark-unplayed" @click="markPlayed(episode, false)">
              <v-list-item-title>{{ $t('page.kiosk.audio.books.markUnplayed') }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
  </div>
</template>

<script lang="js">
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'
import { clockText, isInProgress, progressOf, RELOAD_DELAY_MS } from '@/utils/audiobooks'

/**
 * The episodes of one podcast inside the audiobooks popup (openspec change
 * `kiosk-audiobooks`). A tap resumes a started episode and plays any other
 * from 0; the menu offers "Von vorne" and the played marks. After each
 * successful action the episodes are reloaded once and `changed` asks the
 * popup to reload its list.
 */
export default {
  name: 'AudioPodcastDetail',

  mixins: [audioCommand],

  props: {
    podcast: { type: Object, required: true },
    target: { type: Object, default: null }
  },

  data: () => ({
    episodes: [],
    loaded: false,
    loading: false,
    failed: false,
    reloadTimer: null
  }),

  mounted () {
    this.load()
  },

  beforeDestroy () {
    if (this.reloadTimer !== null) {
      clearTimeout(this.reloadTimer)
    }
  },

  methods: {
    clockText,
    isInProgress,
    progressOf,
    async load () {
      this.loading = true
      try {
        this.episodes = await audioService.getPodcastEpisodes(this.podcast.id)
        this.loaded = true
        this.failed = false
      } catch (err) {
        this.failed = true
      } finally {
        this.loading = false
      }
    },
    tap (episode) {
      this.play(episode, isInProgress(episode) ? undefined : 0)
    },
    async play (episode, position) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      if (await this.runAudioCommand(() => audioService.playItem(targetId, episode.uri, position))) {
        this.afterAction()
      }
    },
    async markPlayed (episode, played) {
      if (await this.runAudioCommand(() => audioService.setPlayed(episode.uri, played))) {
        this.afterAction()
      }
    },
    afterAction () {
      this.$emit('changed')
      if (this.reloadTimer !== null) {
        clearTimeout(this.reloadTimer)
      }
      this.reloadTimer = setTimeout(() => {
        this.reloadTimer = null
        this.load()
      }, RELOAD_DELAY_MS)
    }
  }
}
</script>

<style lang="scss">
.audio-podcast-episodes {
  display: flex;
  flex-direction: column;
}

.audio-podcast-episode {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(128, 128, 128, 0.2);

  &.audio-podcast-episode--played .audio-podcast-episode-name {
    opacity: 0.6;
  }
}

.audio-podcast-episode-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 52px;
  padding: 4px 8px;
  text-align: left;
  color: inherit;
}

.audio-podcast-episode-text {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}

.audio-podcast-episode-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-podcast-episode-facts {
  opacity: 0.7;
}
</style>
