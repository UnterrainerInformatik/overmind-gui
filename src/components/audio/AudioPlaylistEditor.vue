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
            @back="backToList"
            @rename="promptRename"
            @delete="confirmDelete = true"
            @remove="removeTrack"
            @move="moveTrack"
            @add="view = 'search'"
            @retry="loadTracks"
          ></AudioPlaylistTracks>
          <AudioLibrarySearch
            v-if="openPlaylist.editable"
            v-show="wide || view === 'search'"
            :key="`s-${openPlaylist.id}`"
            class="audio-editor-column audio-editor-column--search"
            :existing-uris="trackUris"
            :busy="busy"
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
 */
export default {
  name: 'AudioPlaylistEditor',

  components: { AudioPlaylistList, AudioPlaylistTracks, AudioLibrarySearch, AudioNamePrompt },

  props: {
    value: { type: Boolean, default: false }
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
    confirmDelete: false
  }),

  computed: {
    wide () {
      return this.$vuetify.breakpoint.mdAndUp
    },
    trackUris () {
      return this.tracks.map(t => t.uri).filter(uri => !!uri)
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
          this.loadPlaylists()
        }
      }
    }
  },

  methods: {
    onKeydown (event) {
      if (event.key === 'Escape' && !this.prompt.open && !this.confirmDelete) {
        this.$emit('input', false)
      }
    },
    async loadPlaylists () {
      this.loadingPlaylists = true
      try {
        this.playlists = await audioService.getPlaylists()
        this.playlistsFailed = false
      } catch (err) {
        this.playlistsFailed = true
      } finally {
        this.loadingPlaylists = false
      }
    },
    async loadTracks () {
      const playlist = this.openPlaylist
      if (!playlist) {
        return
      }
      this.loadingTracks = true
      try {
        const tracks = await audioService.getPlaylistTracks(playlist.id)
        if (this.openPlaylist !== playlist) {
          return
        }
        this.tracks = tracks
        this.tracksFailed = false
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
        this.tracks = []
        this.tracksFailed = true
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
