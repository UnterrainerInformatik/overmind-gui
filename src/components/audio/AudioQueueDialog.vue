<template>
  <v-dialog
    :value="value"
    max-width="640"
    :fullscreen="$vuetify.breakpoint.xsOnly"
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card class="audio-queue-dialog">
      <v-card-title class="audio-dialog-title">
        <span>{{ $t('page.kiosk.audio.queue') }}</span>
        <v-spacer></v-spacer>
        <v-btn
          v-if="$vuetify.breakpoint.xsOnly"
          icon
          class="audio-queue-edit-playlists"
          :aria-label="$t('page.kiosk.audio.editor.editPlaylists')"
          :title="$t('page.kiosk.audio.editor.editPlaylists')"
          @click="editorOpen = true"
        >
          <v-icon>edit</v-icon>
        </v-btn>
        <v-btn v-else text class="audio-queue-edit-playlists" @click="editorOpen = true">
          <v-icon left>edit</v-icon>{{ $t('page.kiosk.audio.editor.editPlaylists') }}
        </v-btn>
        <v-btn icon class="audio-dialog-close" :aria-label="$t('page.kiosk.audio.close')" @click="$emit('input', false)">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-0">
        <div v-if="loadingQueue && queue.length === 0" class="pa-4">
          <v-progress-linear indeterminate></v-progress-linear>
        </div>
        <div v-else-if="queueFailed" class="pa-4 audio-queue-message">{{ $t('page.kiosk.audio.loadFailed') }}</div>
        <div v-else-if="queue.length === 0" class="pa-4 audio-queue-message audio-queue-empty">{{ $t('page.kiosk.audio.queueEmpty') }}</div>
        <div
          v-for="(track, index) in queue"
          :key="`q-${index}`"
          class="audio-queue-entry"
          :class="{ 'audio-queue-entry--current': index === currentIndex }"
          :data-index="index"
          @click="playIndex(index)"
        >
          <v-img v-if="track.imageUrl" :src="track.imageUrl" class="audio-queue-cover" width="40" height="40" contain></v-img>
          <div v-else class="audio-queue-cover audio-queue-cover--empty"><v-icon small>music_note</v-icon></div>
          <div class="audio-queue-text">
            <div class="audio-queue-title">{{ track.title }}</div>
            <div v-if="track.artist" class="audio-queue-artist text-caption">{{ track.artist }}</div>
          </div>
          <v-icon v-if="index === currentIndex" class="ml-2">equalizer</v-icon>
        </div>

        <div class="audio-queue-section audio-queue-playlists-head px-4 pt-2">
          <span class="text-overline">{{ $t('page.kiosk.audio.playlists') }}</span>
          <v-spacer></v-spacer>
          <v-btn
            icon
            class="audio-queue-shuffle"
            :class="{ 'audio-queue-shuffle--on': shuffle }"
            :color="shuffle ? 'light-blue lighten-2' : null"
            :input-value="shuffle"
            :aria-pressed="shuffle ? 'true' : 'false'"
            :aria-label="$t(shuffle ? 'page.kiosk.audio.editor.shuffleOn' : 'page.kiosk.audio.editor.shuffleOff')"
            :title="$t(shuffle ? 'page.kiosk.audio.editor.shuffleOn' : 'page.kiosk.audio.editor.shuffleOff')"
            @click="toggleShuffle"
          >
            <v-icon>{{ shuffle ? 'shuffle_on' : 'shuffle' }}</v-icon>
          </v-btn>
        </div>
        <div v-if="!playlistsFailed && playlists.length > 0" class="px-4 pb-2">
          <v-text-field
            :value="playlistFilter"
            class="audio-queue-playlist-filter"
            :label="$t('page.kiosk.audio.editor.filter')"
            prepend-inner-icon="search"
            clearable
            hide-details
            dense
            outlined
            @input="playlistFilter = $event || ''"
          ></v-text-field>
        </div>
        <div v-if="playlistsFailed" class="px-4 pb-4 audio-queue-message">{{ $t('page.kiosk.audio.loadFailed') }}</div>
        <div v-else-if="!loadingPlaylists && playlists.length === 0" class="px-4 pb-4 audio-queue-message">{{ $t('page.kiosk.audio.noPlaylists') }}</div>
        <div v-else-if="playlists.length > 0 && shownPlaylists.length === 0" class="px-4 pb-4 audio-queue-message audio-queue-no-match">{{ $t('page.kiosk.audio.editor.noPlaylists') }}</div>
        <div
          v-for="playlist in shownPlaylists"
          :key="`p-${playlist.id}`"
          class="audio-playlist-entry"
          :class="{ 'audio-playlist-entry--current': isCurrentPlaylist(playlist) }"
          :data-id="playlist.id"
          @click="playPlaylist(playlist)"
        >
          <v-img v-if="playlist.imageUrl" :src="playlist.imageUrl" class="audio-queue-cover" width="40" height="40" contain></v-img>
          <div v-else class="audio-queue-cover audio-queue-cover--empty"><v-icon small>queue_music</v-icon></div>
          <div class="audio-queue-text">
            <div class="audio-queue-title">{{ playlist.name }}</div>
            <div v-if="playlist.trackCount !== null" class="audio-queue-artist text-caption">{{ playlist.trackCount }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <AudioPlaylistEditor v-if="editorMounted" v-model="editorOpen" :target="target"></AudioPlaylistEditor>
  </v-dialog>
</template>

<script lang="js">
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'
import { audioShuffle, setShuffle } from '@/utils/audioShuffle'
import { SseClient } from '@/utils/sseClient'

// Lazy, so vuedraggable and the editor only load when someone edits.
const AudioPlaylistEditor = () => import('@/components/audio/AudioPlaylistEditor.vue')

/** Events within this window lead to one reload, like the editor's. */
const LIVE_RELOAD_DEBOUNCE_MS = 300

/**
 * The current target's queue and the playlists to replace it with (openspec
 * change `kiosk-audio-bar`). Opened from the bar's title, and the way into the
 * playlist editor (change `kiosk-playlist-editor`), after which the playlists
 * and the queue are reloaded. While open it reloads the queue whenever the
 * target's track or playlist changes, so the highlight follows the music.
 * It also reloads in the background, also behind the editor, on the SSE
 * events `audio-queue-changed` (this target only), `audio-playlist-changed`
 * and after a reconnect (change `kiosk-queue-live-updates`).
 * A playlist is played with the device's shuffle choice, the same one the
 * editor shows (change `kiosk-playlist-editor-extras`, design D2).
 */
export default {
  name: 'AudioQueueDialog',

  components: { AudioPlaylistEditor },

  mixins: [audioCommand],

  props: {
    value: { type: Boolean, default: false },
    target: { type: Object, default: null }
  },

  data: () => ({
    queue: [],
    queueIndex: null,
    loadingQueue: false,
    queueFailed: false,
    playlists: [],
    loadingPlaylists: false,
    playlistsFailed: false,
    editorOpen: false,
    editorMounted: false,
    playlistFilter: '',
    shuffleStore: audioShuffle,
    listening: false,
    pending: { queue: false, playlists: false },
    flushTimer: null
  }),

  computed: {
    shuffle () {
      return this.shuffleStore.on
    },
    /** Changes whenever the queue the server holds for the target may have changed. */
    queueSignature () {
      if (!this.target) {
        return null
      }
      const p = this.target.playback
      const track = p && p.track ? p.track.uri || p.track.title : ''
      return `${this.target.targetId}|${p && p.sourceUri ? p.sourceUri : ''}|${p ? p.queueIndex : ''}|${track}`
    },
    currentIndex () {
      if (this.queueIndex !== null) {
        return this.queueIndex
      }
      return this.target && this.target.playback ? this.target.playback.queueIndex : null
    },
    /** Same rule as the editor's filter, so both lists match alike. */
    shownPlaylists () {
      const q = this.playlistFilter.trim().toLowerCase()
      return q === '' ? this.playlists : this.playlists.filter(p => p.name.toLowerCase().includes(q))
    }
  },

  watch: {
    value (open) {
      if (open) {
        this.playlistFilter = ''
        this.startLive()
        this.loadQueue()
        this.loadPlaylists()
      } else {
        this.stopLive()
      }
    },
    editorOpen (open) {
      if (open) {
        this.editorMounted = true
      } else if (this.value) {
        this.loadQueue()
        this.loadPlaylists()
      }
    },
    queueSignature () {
      if (this.value) {
        this.loadQueue()
      }
    }
  },

  beforeDestroy () {
    this.stopLive()
  },

  methods: {
    /**
     * `quiet`: a background reload, which neither shows the loading
     * placeholder nor clears the shown queue or sets the failed flag on error.
     */
    async loadQueue (quiet = false) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      if (!quiet) {
        this.loadingQueue = true
      }
      try {
        const answer = await audioService.getQueue(targetId)
        if (!this.target || this.target.targetId !== targetId) {
          return
        }
        this.queue = answer.items
        this.queueIndex = answer.currentIndex
        this.queueFailed = false
      } catch (err) {
        if (!quiet && this.target && this.target.targetId === targetId) {
          this.queue = []
          this.queueIndex = null
          this.queueFailed = true
        }
      } finally {
        if (!quiet) {
          this.loadingQueue = false
        }
      }
    },
    async loadPlaylists (quiet = false) {
      if (!quiet) {
        this.loadingPlaylists = true
      }
      try {
        this.playlists = await audioService.getPlaylists()
        this.playlistsFailed = false
      } catch (err) {
        if (!quiet) {
          this.playlistsFailed = true
        }
      } finally {
        if (!quiet) {
          this.loadingPlaylists = false
        }
      }
    },

    startLive () {
      if (!this.listening) {
        const sse = SseClient.getInstance()
        sse.addEventListener('audio-queue-changed', this.onQueueChanged)
        sse.addEventListener('audio-playlist-changed', this.onPlaylistChanged)
        sse.addEventListener('connected', this.onReconnected)
        this.listening = true
      }
    },
    stopLive () {
      if (this.listening) {
        const sse = SseClient.getInstance()
        sse.removeEventListener('audio-queue-changed', this.onQueueChanged)
        sse.removeEventListener('audio-playlist-changed', this.onPlaylistChanged)
        sse.removeEventListener('connected', this.onReconnected)
        this.listening = false
      }
      this.clearFlushTimer()
      this.pending = { queue: false, playlists: false }
    },
    onQueueChanged (payload) {
      const targetId = payload && payload.targetId != null ? `${payload.targetId}` : null
      if (this.target && targetId === `${this.target.targetId}`) {
        this.pending.queue = true
        this.scheduleFlush()
      }
    },
    onPlaylistChanged () {
      // The GUI cannot tell which playlist plays, so any edit may be the queue's (design D2).
      this.pending.queue = true
      this.pending.playlists = true
      this.scheduleFlush()
    },
    onReconnected () {
      // Events may have been missed while the connection was down.
      this.pending.queue = true
      this.pending.playlists = true
      this.scheduleFlush()
    },
    scheduleFlush () {
      this.clearFlushTimer()
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flushPending()
      }, LIVE_RELOAD_DEBOUNCE_MS)
    },
    clearFlushTimer () {
      if (this.flushTimer !== null) {
        clearTimeout(this.flushTimer)
        this.flushTimer = null
      }
    },
    flushPending () {
      if (!this.value) {
        return
      }
      const { queue, playlists } = this.pending
      this.pending = { queue: false, playlists: false }
      if (queue) {
        this.loadQueue(true)
      }
      if (playlists) {
        this.loadPlaylists(true)
      }
    },
    isCurrentPlaylist (playlist) {
      const p = this.target && this.target.playback
      // The server's `sourceUri` names the playlist the queue pairs with (change `kiosk-playlist-track-play`, D6).
      return !!p && !!p.sourceUri && p.sourceUri === audioService.playlistUri(playlist)
    },
    playIndex (index) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      this.runAudioCommand(() => audioService.playQueueIndex(targetId, index))
    },
    playPlaylist (playlist) {
      if (!this.target) {
        return
      }
      const targetId = this.target.targetId
      const shuffle = this.shuffle
      this.runAudioCommand(() => audioService.playMedia(targetId, audioService.playlistUri(playlist), shuffle))
    },
    toggleShuffle () {
      setShuffle(!this.shuffle)
    }
  }
}
</script>

<style lang="scss">
.audio-queue-entry,
.audio-playlist-entry {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(128, 128, 128, 0.15);

  &.audio-queue-entry--current,
  &.audio-playlist-entry--current {
    background-color: rgba(128, 128, 128, 0.2);
    font-weight: bold;
  }
}

.audio-queue-playlists-head {
  display: flex;
  align-items: center;

  .v-btn.v-btn--icon.audio-queue-shuffle {
    width: 48px;
    height: 48px;
  }
}

.audio-queue-cover,
.audio-queue-cover.v-image {
  // `.v-image` alone would win with Vuetify's `.v-responsive { flex: 1 0 auto }`
  // and push the text to the middle of the row.
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  margin-right: 12px;
  border-radius: 2px;

  &.audio-queue-cover--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(128, 128, 128, 0.2);
  }
}

.audio-queue-text {
  flex: 1 1 auto;
  min-width: 0;

  div {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.audio-queue-artist {
  opacity: 0.7;
}
</style>
