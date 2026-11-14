<template>
  <div class="audio-library-search">
    <div class="audio-editor-toolbar">
      <v-btn
        v-if="showBack"
        icon
        class="audio-editor-icon audio-search-back mr-1"
        :aria-label="$t('page.kiosk.audio.editor.back')"
        @click="$emit('back')"
      >
        <v-icon>arrow_back</v-icon>
      </v-btn>
      <v-text-field
        v-model="query"
        class="audio-search-field"
        :label="$t('page.kiosk.audio.editor.search')"
        prepend-inner-icon="search"
        clearable
        hide-details
        dense
        outlined
      ></v-text-field>
    </div>
    <div v-if="album" class="px-4 pb-2">
      <v-chip close class="audio-search-album-chip" @click:close="leaveAlbum">
        <v-icon left small>album</v-icon>{{ album.name }}
      </v-chip>
    </div>
    <div v-else-if="artist" class="px-4 pb-2">
      <v-chip close class="audio-search-artist" @click:close="leaveArtist">
        <v-icon left small>person</v-icon>{{ artist }}
      </v-chip>
    </div>
    <v-progress-linear class="audio-search-loading" :active="loading" indeterminate height="4"></v-progress-linear>

    <div class="audio-search-scroll">
      <div v-if="!artist && !album && trimmed.length < 2" class="pa-4 audio-editor-message audio-search-hint">{{ $t('page.kiosk.audio.editor.searchHint') }}</div>
      <div v-else-if="failed" class="pa-4 audio-editor-message audio-search-failed">
        <div>{{ $t('page.kiosk.audio.editor.loadFailed') }}</div>
        <v-btn text color="primary" class="audio-search-retry mt-2" @click="runSearch">{{ $t('page.kiosk.audio.editor.retry') }}</v-btn>
      </div>
      <div v-else-if="answered && isEmpty" class="pa-4 audio-editor-message audio-search-none">{{ $t('page.kiosk.audio.editor.noResults') }}</div>
      <template v-else>
        <template v-if="results.tracks.length > 0">
          <div class="audio-queue-section text-overline px-4 pt-2">{{ $t('page.kiosk.audio.editor.tracks') }}</div>
          <div
            v-for="(track, index) in results.tracks"
            :key="`t-${index}-${track.uri}`"
            class="audio-search-result audio-search-track"
            :class="{
              'audio-search-result--added': isAdded(track.uri),
              'audio-search-result--disabled': busy,
              'audio-search-result--current': isCurrent(track.uri)
            }"
            :data-uri="track.uri"
            @click="add(track.uri)"
          >
            <v-img v-if="track.imageUrl" :src="track.imageUrl" class="audio-queue-cover audio-search-dim" width="40" height="40" contain></v-img>
            <div v-else class="audio-queue-cover audio-queue-cover--empty audio-search-dim"><v-icon small>music_note</v-icon></div>
            <div class="audio-queue-text audio-search-dim">
              <div class="audio-queue-title">{{ track.title }}</div>
              <div class="audio-queue-artist text-caption">
                {{ isAdded(track.uri) ? $t('page.kiosk.audio.editor.alreadyAdded') : track.artist }}
              </div>
            </div>
            <v-btn
              icon
              class="audio-search-preview ml-1"
              :disabled="!playTarget"
              :aria-label="$t(previewStops(track.uri) ? 'page.kiosk.audio.editor.previewStop' : 'page.kiosk.audio.editor.previewPlay')"
              :title="tooltips ? $t(previewStops(track.uri) ? 'page.kiosk.audio.editor.previewStop' : 'page.kiosk.audio.editor.previewPlay') : null"
              @click.stop="preview(track.uri)"
            >
              <v-icon>{{ previewStops(track.uri) ? 'stop' : 'play_arrow' }}</v-icon>
            </v-btn>
            <v-icon class="ml-1 audio-search-dim">{{ isAdded(track.uri) ? 'check' : 'add' }}</v-icon>
            <div
              v-if="isCurrent(track.uri) && currentDuration"
              class="audio-row-seek-line audio-search-seek-line"
              @click.stop
            >
              <AudioSeekSlider
                class="audio-row-seek audio-search-seek"
                :target="playTarget"
                :show-time="!$vuetify.breakpoint.xsOnly"
              ></AudioSeekSlider>
            </div>
          </div>
        </template>
        <template v-if="results.albums.length > 0">
          <div class="audio-queue-section text-overline px-4 pt-2">{{ $t('page.kiosk.audio.editor.albums') }}</div>
          <div
            v-for="(album, index) in results.albums"
            :key="`a-${index}-${album.uri}`"
            class="audio-search-result audio-search-album"
            :class="{ 'audio-search-result--disabled': busy }"
            :data-uri="album.uri"
            @click="add(album.uri)"
          >
            <v-img v-if="album.imageUrl" :src="album.imageUrl" class="audio-queue-cover audio-search-dim" width="40" height="40" contain></v-img>
            <div v-else class="audio-queue-cover audio-queue-cover--empty audio-search-dim"><v-icon small>album</v-icon></div>
            <div class="audio-queue-text audio-search-dim">
              <div class="audio-queue-title">{{ album.name }}</div>
              <div v-if="album.artist" class="audio-queue-artist text-caption">{{ album.artist }}</div>
            </div>
            <v-icon class="ml-2 audio-search-dim">playlist_add</v-icon>
            <v-btn
              v-if="album.id !== null"
              icon
              class="audio-editor-icon audio-search-open-album ml-1"
              :aria-label="$t('page.kiosk.audio.editor.openAlbum')"
              :title="tooltips ? $t('page.kiosk.audio.editor.openAlbum') : null"
              @click.stop="openAlbum(album)"
            >
              <v-icon>chevron_right</v-icon>
            </v-btn>
          </div>
        </template>
        <template v-if="results.artists.length > 0">
          <div class="audio-queue-section text-overline px-4 pt-2">{{ $t('page.kiosk.audio.editor.artists') }}</div>
          <div
            v-for="(item, index) in results.artists"
            :key="`r-${index}-${item.uri}`"
            class="audio-search-result audio-search-artist-result"
            :data-uri="item.uri"
            @click="drillInto(item)"
          >
            <v-img v-if="item.imageUrl" :src="item.imageUrl" class="audio-queue-cover" width="40" height="40" contain></v-img>
            <div v-else class="audio-queue-cover audio-queue-cover--empty"><v-icon small>person</v-icon></div>
            <div class="audio-queue-text">
              <div class="audio-queue-title">{{ item.name }}</div>
            </div>
            <v-icon class="ml-2">chevron_right</v-icon>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script lang="js">
import { mapGetters } from 'vuex'
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'
import AudioSeekSlider from '@/components/audio/AudioSeekSlider.vue'

const DEBOUNCE_MILLIS = 400
const MIN_QUERY = 2

const emptyResults = () => ({ tracks: [], albums: [], artists: [] })

/**
 * The library search of the playlist editor (openspec change
 * `kiosk-playlist-editor`, design D5). It searches 400 ms after the last
 * keystroke and from two characters on; a sequence number keeps a late answer
 * for an older query off the screen. Tracks and albums are added by their URI,
 * an artist narrows the results to a track search for its name.
 *
 * Every track can be previewed on `playTarget`, the editor's play target
 * (openspec change `kiosk-search-track-preview`): play replaces that target's
 * queue with the one track, the track the target is on is marked and gets a
 * position slider, and its button pauses or resumes. The marking follows the
 * audio state only, so a fresh preview lights up once the state reports it.
 *
 * An album with an `id` can be opened (change `kiosk-playlist-track-play`,
 * design D5): like the artist drill-in, its tracks replace the results under a
 * closable chip. It remembers the artist it was opened from, so closing it
 * returns to the results it came from; typing leaves both.
 */
export default {
  name: 'AudioLibrarySearch',

  components: { AudioSeekSlider },

  mixins: [audioCommand],

  props: {
    existingUris: { type: Array, default: () => [] },
    busy: { type: Boolean, default: false },
    /** The resolved target previews play on, or null while the audio state is not loaded. */
    playTarget: { type: Object, default: null },
    showBack: { type: Boolean, default: false }
  },

  data: () => ({
    query: '',
    artist: null,
    /** The open album `{id, name, artist}`, `artist` being the drill-in it was opened from. */
    album: null,
    results: emptyResults(),
    loading: false,
    failed: false,
    answered: false,
    sequence: 0,
    timer: null
  }),

  computed: {
    ...mapGetters('gui/tooltips', {
      tooltips: 'tooltips'
    }),
    playback () {
      return this.playTarget ? this.playTarget.playback : null
    },
    currentUri () {
      return this.playback && this.playback.track ? this.playback.track.uri : null
    },
    currentPlaying () {
      return !!this.playback && this.playback.state === 'playing'
    },
    currentDuration () {
      return this.playback && this.playback.duration ? this.playback.duration : null
    },
    trimmed () {
      return (this.query || '').trim()
    },
    existing () {
      return new Set(this.existingUris)
    },
    isEmpty () {
      return this.results.tracks.length === 0 && this.results.albums.length === 0 && this.results.artists.length === 0
    }
  },

  watch: {
    query () {
      this.artist = null
      this.album = null
      this.schedule()
    }
  },

  beforeDestroy () {
    clearTimeout(this.timer)
  },

  methods: {
    schedule () {
      clearTimeout(this.timer)
      // Anything already in flight is stale from this keystroke on.
      this.sequence++
      this.loading = false
      if (this.trimmed.length < MIN_QUERY) {
        this.results = emptyResults()
        this.answered = false
        this.failed = false
        return
      }
      this.timer = setTimeout(() => this.runSearch(), DEBOUNCE_MILLIS)
    },
    runSearch () {
      if (this.album) {
        const id = this.album.id
        return this.load(async () => ({ tracks: await audioService.getAlbumTracks(id), albums: [], artists: [] }))
      }
      if (this.artist) {
        return this.search(this.artist, ['track'])
      }
      if (this.trimmed.length >= MIN_QUERY) {
        return this.search(this.trimmed, ['track', 'album', 'artist'])
      }
    },
    search (text, types) {
      return this.load(() => audioService.search(text, types))
    },
    /** Shows `fetch`'s answer unless a newer request was started meanwhile. */
    async load (fetch) {
      const sequence = ++this.sequence
      this.loading = true
      try {
        const answer = await fetch()
        if (sequence !== this.sequence) {
          return
        }
        this.results = answer
        this.failed = false
        this.answered = true
      } catch (err) {
        if (sequence !== this.sequence) {
          return
        }
        this.results = emptyResults()
        this.failed = true
      } finally {
        if (sequence === this.sequence) {
          this.loading = false
        }
      }
    },
    drillInto (item) {
      clearTimeout(this.timer)
      this.artist = item.name
      this.results = emptyResults()
      this.answered = false
      this.search(item.name, ['track'])
    },
    openAlbum (item) {
      clearTimeout(this.timer)
      this.album = { id: item.id, name: item.name, artist: this.artist }
      this.results = emptyResults()
      this.answered = false
      this.failed = false
      this.runSearch()
    },
    leaveAlbum () {
      this.artist = this.album ? this.album.artist : null
      this.album = null
      this.results = emptyResults()
      this.answered = false
      this.failed = false
      this.runSearch()
    },
    leaveArtist () {
      this.artist = null
      this.results = emptyResults()
      this.answered = false
      this.runSearch()
    },
    isAdded (uri) {
      return this.existing.has(uri)
    },
    /** True for the track the target is on, playing or paused (design D2). */
    isCurrent (uri) {
      return !!uri && uri === this.currentUri
    },
    previewStops (uri) {
      return this.isCurrent(uri) && this.currentPlaying
    },
    preview (uri) {
      const target = this.playTarget
      if (!target) {
        return
      }
      const targetId = target.targetId
      if (this.isCurrent(uri)) {
        // No stop command on the server: stop pauses, play resumes.
        const command = this.currentPlaying ? 'pause' : 'play'
        this.runAudioCommand(() => audioService.command(targetId, command))
        return
      }
      // Without `shuffle`, which does not matter for a one-track queue.
      this.runAudioCommand(() => audioService.playMedia(targetId, uri), 'page.kiosk.audio.editor.playFailed')
    },
    add (uri) {
      if (this.busy || this.isAdded(uri)) {
        return
      }
      this.$emit('add', uri)
    }
  }
}
</script>

<style lang="scss">
.audio-library-search {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.audio-search-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}

.audio-search-result {
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 0 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(128, 128, 128, 0.15);

  // Only the parts that add are dimmed: a track's preview button and slider
  // work while the playlist is busy and on tracks already in it.
  &.audio-search-result--added {
    cursor: default;

    .audio-search-dim {
      opacity: 0.6;
    }
  }

  &.audio-search-result--disabled {
    cursor: default;

    .audio-search-dim {
      opacity: 0.5;
    }
  }

  &.audio-search-result--current {
    background-color: rgba(128, 128, 128, 0.2);

    .audio-queue-title {
      font-weight: bold;
    }
  }
}

.audio-search-track {
  flex-wrap: wrap;

  // A zero basis, so a long title shrinks instead of wrapping the buttons
  // onto the slider's line.
  .audio-queue-text {
    flex: 1 1 0;
  }
}
</style>
