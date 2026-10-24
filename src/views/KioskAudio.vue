<template>
  <div class="kiosk-audio">
    <div class="kiosk-audio-bar">
      <KioskLinkPanel
        :text="$t('page.kiosk.linkBack')"
        route="/app/kioskoverview"
      ></KioskLinkPanel>
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
  </div>
</template>

<script type="js">
// @ is an alias to /src
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'

export default {
  name: 'kioskAudio',

  components: {
    KioskLinkPanel
  },

  data: () => ({
    src: null
  }),

  methods: {
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
