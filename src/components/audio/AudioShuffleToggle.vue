<template>
  <v-btn
    icon
    class="audio-shuffle-toggle"
    :class="{ 'audio-shuffle-toggle--on': shown }"
    :color="shown ? 'light-blue lighten-2' : null"
    :input-value="shown"
    :disabled="disabled || !target"
    :aria-pressed="shown ? 'true' : 'false'"
    :aria-label="label"
    :title="tooltips ? label : null"
    @click="toggle"
  >
    <v-icon>{{ shown ? 'shuffle_on' : 'shuffle' }}</v-icon>
  </v-btn>
</template>

<script lang="js">
import { mapGetters } from 'vuex'
import { singleton as audioService } from '@/utils/webservices/audioService'
import { audioCommand } from '@/mixins/audioCommand'

// How long a tapped mode is shown while no state confirms it, like the bar's volume hold.
const HOLD_MS = 3000

/**
 * The player's shuffle mode for one target, shared by the audio bar and the
 * queue popup (openspec change `audio-shuffle-on-player`, design D2). It shows
 * the target's `playback.shuffle` and switches it at once on tap. The
 * requested mode is held until a state reports it, `HOLD_MS` passes, the
 * switch fails or the target changes; then the state's mode shows again.
 */
export default {
  name: 'AudioShuffleToggle',

  mixins: [audioCommand],

  props: {
    target: { type: Object, default: null },
    disabled: { type: Boolean, default: false }
  },

  data: () => ({
    held: null,
    holdTimer: null
  }),

  computed: {
    ...mapGetters('gui/tooltips', {
      tooltips: 'tooltips'
    }),
    stateShuffle () {
      return !!this.target && !!this.target.playback && this.target.playback.shuffle === true
    },
    shown () {
      return this.held !== null ? this.held : this.stateShuffle
    },
    label () {
      return this.$t(this.shown ? 'page.kiosk.audio.shuffleOn' : 'page.kiosk.audio.shuffleOff')
    }
  },

  watch: {
    stateShuffle (shuffle) {
      if (this.held !== null && shuffle === this.held) {
        this.clearHold()
      }
    },
    'target.targetId' () {
      this.clearHold()
    }
  },

  beforeDestroy () {
    this.clearHold()
  },

  methods: {
    clearHold () {
      if (this.holdTimer !== null) {
        clearTimeout(this.holdTimer)
        this.holdTimer = null
      }
      this.held = null
    },
    async toggle () {
      if (!this.target || this.disabled) {
        return
      }
      const targetId = this.target.targetId
      const enabled = !this.shown
      this.clearHold()
      this.held = enabled
      this.holdTimer = setTimeout(() => {
        this.holdTimer = null
        this.held = null
      }, HOLD_MS)
      const ok = await this.runAudioCommand(() => audioService.setShuffle(targetId, enabled))
      // Only end the hold this tap set: a later tap or target change owns it otherwise.
      if (!ok && this.held === enabled && this.target && this.target.targetId === targetId) {
        this.clearHold()
      }
    }
  }
}
</script>
