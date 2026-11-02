<template>
  <div class="kiosk-audio">
    <div class="kiosk-audio-bar">
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>
      <KioskPanel
        class="noFocus kiosk-link-panel kiosk-audio-playlists"
        borderColor="disabled"
        bgColor="disabled darken-4"
        pa="1"
        :renderTitle="false"
        maxWidth="220px"
        @click="openEditor"
      >
        <div class="kiosk-link-panel-row">
          <v-avatar color="disabled darken-2" size="24" class="mr-2">
            <v-icon small>queue_music</v-icon>
          </v-avatar>
          <span class="kiosk-link-panel-text">{{ $t('page.kiosk.audioPlaylists') }}</span>
        </div>
      </KioskPanel>
    </div>
    <iframe
      v-if="src"
      class="kiosk-audio-frame"
      :src="src"
      allow="autoplay; fullscreen"
    ></iframe>
    <div v-else class="kiosk-audio-notice pa-4">
      {{ $t('page.kiosk.audioNotConfigured') }}
    </div>
    <AudioPlaylistEditor v-if="editorMounted" v-model="editorOpen"></AudioPlaylistEditor>
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import KioskPanel from '@/components/KioskPanel.vue'

// Lazy, so vuedraggable and the editor only load when someone edits.
const AudioPlaylistEditor = () => import('@/components/audio/AudioPlaylistEditor.vue')

/**
 * Music Assistant's own UI, embedded, and a way into the playlist editor
 * (openspec change `kiosk-playlist-editor-extras`, design D7). The editor opens
 * on top without a `target`: it resolves the device's stored one itself. The
 * iframe stays mounted, so Music Assistant keeps its page.
 */
export default {
  name: 'kioskAudio',

  components: {
    KioskLinkPanel,
    KioskPanel,
    AudioPlaylistEditor
  },

  data: () => ({
    src: null,
    editorOpen: false,
    editorMounted: false
  }),

  methods: {
    openEditor () {
      this.editorMounted = true
      this.editorOpen = true
    },
    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    }),
    // Music Assistant takes an externally supplied session token from `?code=`,
    // stores it and strips it from its URL; without a token it shows its own login.
    buildSrc () {
      const config = (window.overmindConfig && window.overmindConfig.musicAssistant) || {}
      if (!config.url) {
        return null
      }
      if (!config.token) {
        return config.url
      }
      const separator = config.url.includes('?') ? '&' : '?'
      return config.url + separator + 'code=' + encodeURIComponent(config.token)
    }
  },

  mounted () {
    this.kioskMode(true)
    this.src = this.buildSrc()
  }
}
</script>

<style lang="scss">
@import 'index.scss';

/* Fixed over the whole viewport so neither the main container's padding nor the
   page scrolling gets in the way; covers the kiosk settings button as well, which
   would otherwise sit on top of Music Assistant's player bar. */
.kiosk-audio {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 25;
  display: flex;
  flex-direction: column;
  background-color: var(--v-background-base, #121212);
}

.kiosk-audio-bar {
  flex: 0 0 auto;
  display: flex;
}

.kiosk-audio-frame {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  border: 0;
  display: block;
}

.kiosk-audio-notice {
  flex: 1 1 auto;
}

.noFocus:focus::before {
  opacity: 0 !important;
}
</style>
