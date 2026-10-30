<template>
  <div class="audio-playlist-tracks">
    <div class="audio-editor-header">
      <v-btn icon class="audio-editor-icon audio-tracks-back" :aria-label="$t('page.kiosk.audio.editor.back')" @click="$emit('back')">
        <v-icon>arrow_back</v-icon>
      </v-btn>
      <div class="audio-tracks-name text-h6">{{ playlist.name }}</div>
      <v-chip v-if="!playlist.editable" small class="audio-tracks-readonly ml-2">
        <v-icon x-small left>lock</v-icon>{{ $t('page.kiosk.audio.editor.readOnlyMark') }}
      </v-chip>
      <template v-else>
        <v-btn
          icon
          class="audio-editor-icon audio-tracks-rename"
          :disabled="busy"
          :aria-label="$t('page.kiosk.audio.editor.rename')"
          @click="$emit('rename')"
        >
          <v-icon>edit</v-icon>
        </v-btn>
        <v-btn
          icon
          class="audio-editor-icon audio-tracks-delete"
          :disabled="busy"
          :aria-label="$t('page.kiosk.audio.editor.delete')"
          @click="$emit('delete')"
        >
          <v-icon>delete</v-icon>
        </v-btn>
      </template>
    </div>
    <v-progress-linear
      class="audio-tracks-busy"
      :active="busy || loading"
      indeterminate
      height="4"
    ></v-progress-linear>

    <div class="audio-tracks-scroll">
      <div v-if="failed" class="pa-4 audio-editor-message audio-tracks-failed">
        <div>{{ $t('page.kiosk.audio.editor.loadFailed') }}</div>
        <v-btn text color="primary" class="audio-tracks-retry mt-2" @click="$emit('retry')">{{ $t('page.kiosk.audio.editor.retry') }}</v-btn>
      </div>
      <div v-else-if="!loading && rows.length === 0" class="pa-4 audio-editor-message audio-tracks-empty">{{ $t('page.kiosk.audio.editor.noTracks') }}</div>
      <draggable
        v-else
        :list="rows"
        class="audio-tracks-list"
        :class="{ 'audio-tracks-list--busy': busy }"
        handle=".audio-track-handle"
        :delay="0"
        :animation="150"
        :disabled="busy || !playlist.editable"
        ghost-class="audio-track--ghost"
        @end="onEnd"
      >
        <div
          v-for="(row, index) in rows"
          :key="row.key"
          class="audio-track"
          :data-index="index"
        >
          <div
            v-if="playlist.editable"
            class="audio-track-handle"
            :aria-label="$t('page.kiosk.audio.editor.drag')"
          >
            <v-icon>drag_indicator</v-icon>
          </div>
          <v-img v-if="row.track.imageUrl" :src="row.track.imageUrl" class="audio-queue-cover" width="40" height="40" contain></v-img>
          <div v-else class="audio-queue-cover audio-queue-cover--empty"><v-icon small>music_note</v-icon></div>
          <div class="audio-queue-text">
            <div class="audio-queue-title">{{ row.track.title }}</div>
            <div v-if="row.track.artist" class="audio-queue-artist text-caption">{{ row.track.artist }}</div>
          </div>
          <v-btn
            v-if="playlist.editable"
            icon
            class="audio-editor-icon audio-track-remove"
            :disabled="busy"
            :aria-label="$t('page.kiosk.audio.editor.remove')"
            @click="$emit('remove', index)"
          >
            <v-icon>remove_circle_outline</v-icon>
          </v-btn>
        </div>
      </draggable>
    </div>

    <div v-if="showAddButton && playlist.editable" class="audio-tracks-add pa-3">
      <v-btn block large color="primary" class="audio-tracks-add-btn" @click="$emit('add')">
        <v-icon left>playlist_add</v-icon>{{ $t('page.kiosk.audio.editor.addTracks') }}
      </v-btn>
    </div>
  </div>
</template>

<script lang="js">
import draggable from 'vuedraggable'

/**
 * The tracks of the open playlist (openspec change `kiosk-playlist-editor`,
 * design D3). Dragging starts only from the handle, so swiping a row still
 * scrolls. SortableJS moves the row locally on drop; the editor then writes the
 * move and reloads, which replaces the local order with the server's.
 */
export default {
  name: 'AudioPlaylistTracks',

  components: { draggable },

  props: {
    playlist: { type: Object, required: true },
    tracks: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    failed: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    showAddButton: { type: Boolean, default: false }
  },

  data: () => ({
    rows: [],
    generation: 0
  }),

  watch: {
    tracks: {
      immediate: true,
      handler (tracks) {
        // A fresh key per load, so a reload never reuses a row SortableJS has moved.
        this.generation++
        this.rows = tracks.map((track, i) => ({ key: `${this.generation}-${i}`, track }))
      }
    }
  },

  methods: {
    onEnd (event) {
      if (event.oldIndex !== event.newIndex) {
        this.$emit('move', event.oldIndex, event.newIndex)
      }
    }
  }
}
</script>

<style lang="scss">
.audio-playlist-tracks {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.audio-editor-header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  min-height: 56px;
}

.audio-tracks-name {
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 4px;
}

.audio-editor-icon.v-btn.v-btn--icon {
  width: 48px;
  height: 48px;
}

.audio-tracks-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}

.audio-track {
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 0 8px 0 0;
  border-bottom: 1px solid rgba(128, 128, 128, 0.15);

  .audio-queue-cover:first-child {
    margin-left: 16px;
  }
}

.audio-track-handle {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
}

.audio-tracks-list--busy .audio-track-handle {
  cursor: default;
  opacity: 0.4;
}

.audio-track--ghost {
  opacity: 0.4;
}
</style>
