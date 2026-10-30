<template>
  <div class="audio-playlist-list">
    <div class="audio-editor-toolbar">
      <v-text-field
        :value="filter"
        class="audio-playlist-filter"
        :label="$t('page.kiosk.audio.editor.filter')"
        prepend-inner-icon="search"
        clearable
        hide-details
        dense
        outlined
        @input="$emit('update:filter', $event || '')"
      ></v-text-field>
      <v-btn color="primary" large class="audio-playlist-create ml-2" :disabled="busy" :aria-label="$t('page.kiosk.audio.editor.newPlaylist')" @click="$emit('create')">
        <v-icon left>add</v-icon>
        <span class="audio-playlist-create-text">{{ $t('page.kiosk.audio.editor.newPlaylist') }}</span>
      </v-btn>
    </div>
    <v-switch
      :input-value="showReadOnly"
      class="audio-playlist-readonly-toggle px-4 mt-0 mb-2"
      :label="$t('page.kiosk.audio.editor.showReadOnly')"
      hide-details
      inset
      @change="$emit('update:showReadOnly', !!$event)"
    ></v-switch>

    <v-progress-linear v-if="loading" indeterminate class="audio-playlist-loading"></v-progress-linear>
    <div v-if="failed" class="pa-4 audio-editor-message audio-playlist-failed">
      <div>{{ $t('page.kiosk.audio.editor.loadFailed') }}</div>
      <v-btn text color="primary" class="audio-playlist-retry mt-2" @click="$emit('retry')">{{ $t('page.kiosk.audio.editor.retry') }}</v-btn>
    </div>
    <div v-else-if="!loading && shown.length === 0" class="pa-4 audio-editor-message audio-playlist-none">{{ $t('page.kiosk.audio.editor.noPlaylists') }}</div>
    <v-virtual-scroll
      v-else
      class="audio-playlist-scroll"
      :items="shown"
      :item-height="56"
      bench="4"
    >
      <template v-slot:default="{ item }">
        <div
          :key="`e-${item.id}`"
          class="audio-editor-playlist"
          :class="{ 'audio-editor-playlist--readonly': !item.editable }"
          :data-id="item.id"
          @click="$emit('open', item)"
        >
          <v-img v-if="item.imageUrl" :src="item.imageUrl" class="audio-queue-cover" width="40" height="40" contain></v-img>
          <div v-else class="audio-queue-cover audio-queue-cover--empty"><v-icon small>queue_music</v-icon></div>
          <div class="audio-queue-text">
            <div class="audio-queue-title">{{ item.name }}</div>
            <div v-if="item.trackCount !== null" class="audio-queue-artist text-caption">{{ item.trackCount }}</div>
          </div>
          <v-icon
            v-if="!item.editable"
            class="audio-playlist-lock ml-2"
            small
            :aria-label="$t('page.kiosk.audio.editor.readOnlyMark')"
          >lock</v-icon>
          <v-icon class="ml-1">chevron_right</v-icon>
        </div>
      </template>
    </v-virtual-scroll>
  </div>
</template>

<script lang="js">
// Not in the global component list of plugins/vuetify.ts; only the editor's lazy chunk needs it.
import { VVirtualScroll } from 'vuetify/lib'

/**
 * The playlists of the editor (openspec change `kiosk-playlist-editor`, design
 * D2). MA holds about 1450, almost all read-only m3u files, so only editable
 * ones are listed until the toggle is on; filtering is on the client and the
 * rows are virtual at a fixed 56 px.
 */
export default {
  name: 'AudioPlaylistList',

  components: { VVirtualScroll },

  props: {
    playlists: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    failed: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    // Held by the editor, so they survive opening a playlist and coming back.
    filter: { type: String, default: '' },
    showReadOnly: { type: Boolean, default: false }
  },

  computed: {
    shown () {
      const q = (this.filter || '').trim().toLowerCase()
      return this.playlists
        .filter(p => (this.showReadOnly || p.editable) && (q === '' || p.name.toLowerCase().includes(q)))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    }
  }
}
</script>

<style lang="scss">
.audio-playlist-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.audio-editor-toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
}

.audio-playlist-scroll {
  flex: 1 1 0;
  min-height: 0;
}

.audio-editor-playlist {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(128, 128, 128, 0.15);
}

.audio-editor-message {
  opacity: 0.8;
}

@media (max-width: 599px) {
  .audio-playlist-create-text {
    display: none;
  }

  .audio-playlist-create .v-icon--left {
    margin: 0;
  }
}
</style>
