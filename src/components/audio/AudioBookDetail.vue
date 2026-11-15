<template>
  <div class="audio-book-detail" :class="{ 'audio-book-detail--xs': $vuetify.breakpoint.xsOnly }">
    <div class="audio-book-detail-head">
      <AudioCoverTile
        class="audio-book-detail-cover"
        :name="shown.name"
        :author="authorText"
        :image-url="shown.imageUrl"
        :progress="progress"
        :played="shown.fullyPlayed"
      ></AudioCoverTile>
      <div class="audio-book-detail-meta">
        <div class="text-h6 audio-book-detail-name">{{ shown.name }}</div>
        <div v-if="authorText" class="audio-book-detail-authors">{{ authorText }}</div>
        <div class="text-caption audio-book-detail-facts">
          <span v-if="shown.duration">{{ durationText(shown.duration) }}</span>
          <span v-if="shown.fullyPlayed" class="audio-book-detail-played"> · {{ $t('page.kiosk.audio.books.played') }}</span>
          <span v-else-if="started && shown.duration" class="audio-book-detail-remaining"> · {{ $t('page.kiosk.audio.books.remaining', { time: durationText(shown.duration - shown.resumePosition) }) }}</span>
        </div>
        <v-progress-linear
          v-if="started"
          class="audio-book-detail-progress mt-2"
          :value="Math.round(progress * 100)"
          height="4"
        ></v-progress-linear>
        <div class="audio-book-detail-actions mt-3">
          <v-btn color="primary" class="audio-book-detail-play" :disabled="!target" @click="playMain">
            <v-icon left>play_arrow</v-icon>{{ $t(started ? 'page.kiosk.audio.books.continue' : 'page.kiosk.audio.books.play') }}
          </v-btn>
          <v-btn outlined class="audio-book-detail-restart" :disabled="!target" @click="play(0)">
            <v-icon left>replay</v-icon>{{ $t('page.kiosk.audio.books.restart') }}
          </v-btn>
          <v-menu offset-y left>
            <template v-slot:activator="{ on, attrs }">
              <v-btn icon class="audio-book-detail-menu" :aria-label="$t('page.kiosk.audio.books.more')" :title="$t('page.kiosk.audio.books.more')" v-bind="attrs" v-on="on">
                <v-icon>more_vert</v-icon>
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item class="audio-book-detail-mark-played" @click="markPlayed(true)">
                <v-list-item-title>{{ $t('page.kiosk.audio.books.markPlayed') }}</v-list-item-title>
              </v-list-item>
              <v-list-item class="audio-book-detail-mark-unplayed" @click="markPlayed(false)">
                <v-list-item-title>{{ $t('page.kiosk.audio.books.markUnplayed') }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </div>

    <div class="text-overline mt-4">{{ $t('page.kiosk.audio.books.chapters') }}</div>
    <v-progress-linear v-if="loading && !loaded" indeterminate class="audio-book-detail-loading"></v-progress-linear>
    <div v-else-if="failed && !loaded" class="audio-books-message audio-book-detail-failed">{{ $t('page.kiosk.audio.loadFailed') }}</div>
    <div v-else class="audio-book-chapters">
      <button
        v-for="(chapter, index) in chapters"
        :key="`ch-${index}`"
        type="button"
        class="audio-book-chapter"
        :class="{ 'audio-book-chapter--current': index === currentChapter }"
        :data-index="index"
        :disabled="!target"
        @click="play(chapter.start)"
      >
        <v-icon small class="audio-book-chapter-icon">{{ index === currentChapter ? 'bookmark' : 'play_arrow' }}</v-icon>
        <span class="audio-book-chapter-name">{{ chapter.name }}</span>
        <span class="audio-book-chapter-length text-caption">{{ clockText(chapterEnd(index) - chapter.start) }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="js">
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'
import { chapterEndOf, chapterIndexAt, clockText, durationText, isInProgress, progressOf, RELOAD_DELAY_MS } from '@/utils/audiobooks'
import AudioCoverTile from '@/components/audio/AudioCoverTile.vue'

/**
 * One audiobook inside the audiobooks popup (openspec change
 * `kiosk-audiobooks`, designs D4, D6 and D7). It shows the list entry at once
 * and loads the book with its chapters fresh. "Weiterhören" lets MA resume,
 * "Von vorne" and a chapter tap send a start position, a fully played book
 * starts from 0. After each successful action the book is reloaded once and
 * `changed` asks the popup to reload its list.
 */
export default {
  name: 'AudioBookDetail',

  mixins: [audioCommand],

  components: { AudioCoverTile },

  props: {
    /** The list entry; its detail is loaded on mount. */
    book: { type: Object, required: true },
    target: { type: Object, default: null }
  },

  data: () => ({
    loaded: null,
    loading: false,
    failed: false,
    reloadTimer: null
  }),

  computed: {
    shown () {
      return this.loaded || this.book
    },
    chapters () {
      return this.loaded ? this.loaded.chapters : []
    },
    authorText () {
      return this.shown.authors && this.shown.authors.length > 0 ? this.shown.authors.join(', ') : null
    },
    started () {
      return isInProgress(this.shown)
    },
    progress () {
      return progressOf(this.shown)
    },
    currentChapter () {
      return this.started ? chapterIndexAt(this.chapters, this.shown.resumePosition) : -1
    }
  },

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
    durationText,
    chapterEnd (index) {
      return chapterEndOf(this.chapters, index, this.shown.duration)
    },
    async load () {
      this.loading = true
      try {
        const book = await audioService.getAudiobook(this.book.id)
        if (book) {
          this.loaded = book
        }
        this.failed = !book
      } catch (err) {
        this.failed = true
      } finally {
        this.loading = false
      }
    },
    playMain () {
      // MA resumes a started book; a finished one would resume at its end.
      this.play(this.shown.fullyPlayed ? 0 : undefined)
    },
    async play (position) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      const uri = this.shown.uri
      if (await this.runAudioCommand(() => audioService.playItem(targetId, uri, position))) {
        this.afterAction()
      }
    },
    async markPlayed (played) {
      const uri = this.shown.uri
      if (await this.runAudioCommand(() => audioService.setPlayed(uri, played))) {
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
.audio-book-detail-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.audio-book-detail-cover {
  flex: 0 0 180px;
  width: 180px;

  // name and author are beside the cover
  .audio-cover-tile-name,
  .audio-cover-tile-author {
    display: none;
  }
}

.audio-book-detail-meta {
  flex: 1 1 auto;
  min-width: 0;
}

.audio-book-detail-name {
  word-break: break-word;
  line-height: 1.3;
}

.audio-book-detail-authors {
  opacity: 0.8;
}

.audio-book-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.audio-book-detail--xs {
  .audio-book-detail-head {
    flex-direction: column;
    align-items: stretch;
  }

  .audio-book-detail-cover {
    flex-basis: auto;
    width: 160px;
    align-self: center;
  }
}

.audio-book-chapters {
  display: flex;
  flex-direction: column;
}

.audio-book-chapter {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 4px 8px;
  text-align: left;
  color: inherit;
  border-bottom: 1px solid rgba(128, 128, 128, 0.2);

  &.audio-book-chapter--current {
    background-color: rgba(25, 118, 210, 0.15);
    font-weight: 500;
  }
}

.audio-book-chapter-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-book-chapter-length {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
</style>
