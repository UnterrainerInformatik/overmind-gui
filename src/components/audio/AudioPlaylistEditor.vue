<template>
  <v-dialog
    :value="value"
    fullscreen
    persistent
    no-click-animation
    transition="dialog-bottom-transition"
    @input="$emit('input', $event)"
    @keydown="onKeydown"
  >
    <v-card class="audio-playlist-editor">
      <v-card-title class="audio-dialog-title audio-editor-title">
        <span>{{ $t('page.kiosk.audio.editor.title') }}</span>
        <v-spacer></v-spacer>
        <v-btn icon class="audio-editor-icon audio-editor-close" :aria-label="$t('page.kiosk.audio.close')" @click="$emit('input', false)">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>

      <div class="audio-editor-body">
        <AudioPlaylistList
          v-if="view === 'list' || !openPlaylist"
          :playlists="playlists"
          :loading="loadingPlaylists"
          :failed="playlistsFailed"
          :busy="busy"
          :filter.sync="filter"
          :show-read-only.sync="showReadOnly"
          @open="open"
          @create="promptCreate"
          @retry="loadPlaylists"
        ></AudioPlaylistList>
        <div v-else class="audio-editor-columns" :class="{ 'audio-editor-columns--wide': wide }">
          <AudioPlaylistTracks
            v-show="wide || view === 'playlist'"
            class="audio-editor-column"
            :playlist="openPlaylist"
            :tracks="tracks"
            :loading="loadingTracks"
            :failed="tracksFailed"
            :busy="busy"
            :show-add-button="!wide"
            :can-play="!!playTarget"
            :shuffle="shuffle"
            @back="backToList"
            @rename="promptRename"
            @delete="confirmDelete = true"
            @remove="removeTrack"
            @move="moveTrack"
            @add="view = 'search'"
            @retry="loadTracks"
            @play="play"
            @shuffle="setShuffle"
            @drag-start="onDragStart"
            @drag-end="onDragEnd"
          ></AudioPlaylistTracks>
          <AudioLibrarySearch
            v-if="openPlaylist.editable"
            v-show="wide || view === 'search'"
            :key="`s-${openPlaylist.id}`"
            class="audio-editor-column audio-editor-column--search"
            :existing-uris="trackUris"
            :busy="busy"
            :play-target="playTarget"
            :show-back="!wide"
            @back="view = 'playlist'"
            @add="addTrack"
          ></AudioLibrarySearch>
        </div>
      </div>
    </v-card>

    <AudioNamePrompt
      v-model="prompt.open"
      :title="prompt.mode === 'rename' ? $t('page.kiosk.audio.editor.rename') : $t('page.kiosk.audio.editor.newPlaylist')"
      :initial="prompt.mode === 'rename' && openPlaylist ? openPlaylist.name : ''"
      @confirm="onPromptConfirm"
    ></AudioNamePrompt>

    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card class="audio-delete-confirm">
        <v-card-title class="audio-delete-text">{{ $t('page.kiosk.audio.editor.deleteConfirm', { name: openPlaylist ? openPlaylist.name : '' }) }}</v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text large class="audio-delete-cancel" @click="confirmDelete = false">{{ $t('page.kiosk.audio.editor.cancel') }}</v-btn>
          <v-btn text large color="error" class="audio-delete-ok" @click="deleteOpen">{{ $t('page.kiosk.audio.editor.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script lang="js">
import { singleton as audioService } from '@/utils/webservices/audioService'
import { SseClient } from '@/utils/sseClient'
import { acquire, release } from '@/utils/audioState'
import { readStoredTarget, resolveTarget } from '@/utils/audioTarget'
import { audioShuffle, setShuffle } from '@/utils/audioShuffle'
import { audioCommand } from '@/mixins/audioCommand'
import AudioPlaylistList from '@/components/audio/AudioPlaylistList.vue'
import AudioPlaylistTracks from '@/components/audio/AudioPlaylistTracks.vue'
import AudioLibrarySearch from '@/components/audio/AudioLibrarySearch.vue'
import AudioNamePrompt from '@/components/audio/AudioNamePrompt.vue'

/**
 * The full-screen playlist editor, opened from the queue popup (openspec
 * change `kiosk-playlist-editor`). There is no save button: every edit goes
 * through `runEdit`, which allows one at a time, and the affected list is
 * reloaded afterwards whether it worked or not, so what is on screen is always
 * the server's answer (design D4). At `mdAndUp` an open editable playlist shows
 * its tracks and the search side by side; below that the search is its own
 * view (design D7).
 *
 * `persistent`, because a full-screen dialog has no overlay and Vuetify then
 * counts any click outside its content as a click outside - including the
 * close button of the snackbar an edit put up. Escape still closes it.
 *
 * Change `kiosk-playlist-editor-extras`: the open playlist can be played on
 * the device's audio target (the `target` prop from the queue popup, else the
 * stored target resolved against the shared audio state, design D3) with the
 * device's shuffle choice (D2). While open, the server's
 * `audio-playlist-changed` event and every SSE reconnect reload the list and,
 * when it concerns them, the open playlist's tracks (D5). Such a reload is
 * held back while a drag or an edit runs, flags collapse a burst into one
 * reload, and a short trailing debounce merges events that arrive while idle.
 */
// Merges a burst of playlist events into one reload.
const LIVE_RELOAD_DEBOUNCE_MS = 300

export default {
  name: 'AudioPlaylistEditor',

  components: { AudioPlaylistList, AudioPlaylistTracks, AudioLibrarySearch, AudioNamePrompt },

  mixins: [audioCommand],

  props: {
    value: { type: Boolean, default: false },
    /** The audio bar's resolved target; without it the editor resolves the stored one. */
    target: { type: Object, default: null }
  },

  data: () => ({
    view: 'list',
    filter: '',
    showReadOnly: false,
    playlists: [],
    loadingPlaylists: false,
    playlistsFailed: false,
    openPlaylist: null,
    tracks: [],
    loadingTracks: false,
    tracksFailed: false,
    busy: false,
    prompt: { open: false, mode: 'create' },
    confirmDelete: false,
    shuffleStore: audioShuffle,
    audioStore: null,
    selection: 'main',
    dragging: false,
    pending: { list: false, tracks: false },
    // Counts live events, so a reload started after one also covers it.
    liveSeq: 0,
    flushTimer: null,
    listening: false
  }),

  computed: {
    wide () {
      return this.$vuetify.breakpoint.mdAndUp
    },
    trackUris () {
      return this.tracks.map(t => t.uri).filter(uri => !!uri)
    },
    shuffle () {
      return this.shuffleStore.on
    },
    /** Where play sends the playlist: the target the audio bar would control on this device. */
    playTarget () {
      if (this.target) {
        return this.target
      }
      const state = this.audioStore ? this.audioStore.state : null
      return resolveTarget(state, this.selection, this.$t('page.kiosk.audio.mainGroup'))
    }
  },

  watch: {
    value: {
      immediate: true,
      handler (open) {
        if (open) {
          this.filter = ''
          this.showReadOnly = false
          this.backToList()
          this.startLive()
          this.loadPlaylists()
        } else {
          this.stopLive()
        }
      }
    }
  },

  beforeDestroy () {
    this.stopLive()
  },

  methods: {
    onKeydown (event) {
      if (event.key === 'Escape' && !this.prompt.open && !this.confirmDelete) {
        this.$emit('input', false)
      }
    },
    /** `quiet`: a background reload, which keeps the shown list when it fails. */
    async loadPlaylists (quiet = false) {
      const seq = this.liveSeq
      this.loadingPlaylists = true
      try {
        this.playlists = await audioService.getPlaylists()
        this.playlistsFailed = false
        if (this.liveSeq === seq) {
          this.pending.list = false
        }
        return true
      } catch (err) {
        if (!quiet) {
          this.playlistsFailed = true
        }
        return false
      } finally {
        this.loadingPlaylists = false
      }
    },
    async loadTracks (quiet = false) {
      const playlist = this.openPlaylist
      if (!playlist) {
        return
      }
      const seq = this.liveSeq
      this.loadingTracks = true
      try {
        const tracks = await audioService.getPlaylistTracks(playlist.id)
        if (this.openPlaylist !== playlist) {
          return
        }
        if (this.dragging) {
          // Never replace the rows under SortableJS; load again after the drop.
          this.pending.tracks = true
          return
        }
        this.tracks = tracks
        this.tracksFailed = false
        if (this.liveSeq === seq) {
          this.pending.tracks = false
        }
      } catch (err) {
        if (this.openPlaylist !== playlist) {
          return
        }
        if (err && err.status === 404) {
          this.notify('error', 'page.kiosk.audio.editor.notFound', '')
          this.backToList()
          await this.loadPlaylists()
          return
        }
        if (!quiet) {
          this.tracks = []
          this.tracksFailed = true
        }
      } finally {
        this.loadingTracks = false
      }
    },
    open (playlist) {
      this.openPlaylist = playlist
      this.tracks = []
      this.tracksFailed = false
      this.view = 'playlist'
      this.loadTracks()
    },
    backToList () {
      this.view = 'list'
      this.openPlaylist = null
      this.tracks = []
      this.confirmDelete = false
    },

    /**
     * Runs one edit and then `reload`, failed or not. A `409` or `404` means
     * the open playlist is not what the list said, so the list is reloaded and
     * shown instead. Answers whether the edit itself went through.
     */
    async runEdit (call, reload) {
      if (this.busy) {
        return false
      }
      this.busy = true
      const playlist = this.openPlaylist
      let ok = false
      try {
        try {
          await call()
          ok = true
        } catch (err) {
          const status = err && err.status
          if (status === 409) {
            const name = playlist ? playlist.name : ''
            this.notify('error', 'page.kiosk.audio.editor.editFailed', this.$t('page.kiosk.audio.editor.readOnly', { name }))
          } else if (status === 404) {
            this.notify('error', 'page.kiosk.audio.editor.notFound', '')
          } else {
            this.notify('error', 'page.kiosk.audio.editor.editFailed', (err && err.serverReason) || '')
          }
          if (status === 409 || status === 404) {
            this.backToList()
            await this.loadPlaylists()
            return false
          }
        }
        await reload()
        return ok
      } finally {
        this.busy = false
        // After the caller has seen the result (it may leave the playlist).
        this.$nextTick(() => this.flushPending())
      }
    },
    notify (color, descriptionTKey, message) {
      this.$store.dispatch('gui/snackbar/snackbarEnqueue', {
        color,
        headingTKey: color === 'error' ? 'message.error.heading' : 'message.warning.heading',
        descriptionTKey,
        status: null,
        message
      })
    },

    setShuffle (on) {
      setShuffle(on)
    },
    play () {
      const target = this.playTarget
      const playlist = this.openPlaylist
      if (!target || !playlist) {
        return
      }
      const targetId = target.targetId
      const uri = audioService.playlistUri(playlist)
      const shuffle = this.shuffle
      this.runAudioCommand(() => audioService.playMedia(targetId, uri, shuffle), 'page.kiosk.audio.editor.playFailed')
    },

    startLive () {
      if (!this.target && this.audioStore === null) {
        this.selection = readStoredTarget()
        this.audioStore = acquire()
      }
      if (!this.listening) {
        const sse = SseClient.getInstance()
        sse.addEventListener('audio-playlist-changed', this.onPlaylistChanged)
        sse.addEventListener('connected', this.onReconnected)
        this.listening = true
      }
    },
    stopLive () {
      if (this.audioStore !== null) {
        release()
        this.audioStore = null
      }
      if (this.listening) {
        const sse = SseClient.getInstance()
        sse.removeEventListener('audio-playlist-changed', this.onPlaylistChanged)
        sse.removeEventListener('connected', this.onReconnected)
        this.listening = false
      }
      this.clearFlushTimer()
      this.pending = { list: false, tracks: false }
      this.dragging = false
    },
    onPlaylistChanged (payload) {
      const id = payload && payload.playlistId != null ? `${payload.playlistId}` : null
      const known = id !== null && this.playlists.some(p => `${p.id}` === id)
      this.liveSeq++
      this.pending.list = true
      if (this.openPlaylist && (!known || `${this.openPlaylist.id}` === id)) {
        this.pending.tracks = true
      }
      this.scheduleFlush()
    },
    onReconnected () {
      // Events may have been missed while the connection was down.
      this.liveSeq++
      this.pending.list = true
      this.pending.tracks = !!this.openPlaylist
      this.scheduleFlush()
    },
    onDragStart () {
      this.dragging = true
    },
    onDragEnd () {
      this.dragging = false
      // The drop's move (if any) has already made the editor busy; then runEdit flushes.
      this.$nextTick(() => this.flushPending())
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
    /** Runs the held-back reloads once nothing is in the way. */
    async flushPending () {
      if (!this.value || this.busy || this.dragging || this.flushTimer !== null) {
        return
      }
      const { list, tracks } = this.pending
      if (!list && !tracks) {
        return
      }
      this.pending = { list: false, tracks: false }
      if (list && await this.loadPlaylists(true) && this.openPlaylist) {
        const id = `${this.openPlaylist.id}`
        const fresh = this.playlists.find(p => `${p.id}` === id)
        if (!fresh) {
          this.notify('warning', 'page.kiosk.audio.editor.removedElsewhere', '')
          this.backToList()
          return
        }
        const open = this.openPlaylist
        if (fresh.name !== open.name || fresh.editable !== open.editable || fresh.uri !== open.uri) {
          this.openPlaylist = fresh
        }
      }
      if (tracks && this.openPlaylist) {
        await this.loadTracks(true)
      }
    },

    promptCreate () {
      this.prompt = { open: true, mode: 'create' }
    },
    promptRename () {
      this.prompt = { open: true, mode: 'rename' }
    },
    onPromptConfirm (name) {
      if (this.prompt.mode === 'rename') {
        this.rename(name)
      } else {
        this.create(name)
      }
    },
    async create (name) {
      let created = null
      const ok = await this.runEdit(async () => {
        created = await audioService.createPlaylist(name)
      }, () => this.loadPlaylists())
      if (ok && created) {
        this.open(created)
      }
    },
    async rename (name) {
      const id = this.openPlaylist.id
      await this.runEdit(() => audioService.renamePlaylist(id, name), async () => {
        await this.loadPlaylists()
        const fresh = this.playlists.find(p => `${p.id}` === `${id}`)
        if (fresh && this.openPlaylist && `${this.openPlaylist.id}` === `${id}`) {
          // The same playlist under its new name; not `open`, the tracks are unchanged.
          this.openPlaylist = fresh
        }
      })
    },
    async deleteOpen () {
      this.confirmDelete = false
      const id = this.openPlaylist.id
      const ok = await this.runEdit(() => audioService.deletePlaylist(id), () => this.loadPlaylists())
      if (ok) {
        this.backToList()
      }
    },
    removeTrack (index) {
      const id = this.openPlaylist.id
      this.runEdit(() => audioService.removePlaylistTracks(id, [index]), () => this.loadTracks())
    },
    moveTrack (from, to) {
      const id = this.openPlaylist.id
      this.runEdit(() => audioService.movePlaylistTrack(id, from, to), () => this.loadTracks())
    },
    async addTrack (uri) {
      const id = this.openPlaylist.id
      const before = this.tracks.length
      const ok = await this.runEdit(() => audioService.addPlaylistTracks(id, [uri]), () => this.loadTracks())
      // MA skips a track it already holds and still answers 204 (design D5).
      if (ok && !this.tracksFailed && this.openPlaylist && `${this.openPlaylist.id}` === `${id}` && this.tracks.length === before) {
        this.notify('warning', 'page.kiosk.audio.editor.notAdded', '')
      }
    }
  }
}
</script>

<style lang="scss">
.audio-playlist-editor.v-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.audio-editor-title {
  flex: 0 0 auto;
}

.audio-editor-body {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;

  > * {
    flex: 1 1 0;
    min-height: 0;
  }
}

.audio-editor-columns {
  display: flex;
  min-height: 0;

  .audio-editor-column {
    flex: 1 1 0;
    min-width: 0;
  }

  &.audio-editor-columns--wide .audio-editor-column--search {
    border-left: 1px solid rgba(128, 128, 128, 0.25);
  }
}
</style>
