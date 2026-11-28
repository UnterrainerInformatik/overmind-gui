<template>
  <v-dialog
    :value="value"
    fullscreen
    persistent
    hide-overlay
    no-click-animation
    transition="dialog-bottom-transition"
    content-class="audio-plan-dialog-content"
    @keydown.esc="close"
  >
    <v-card tile class="audio-plan-dialog" :class="{ 'audio-plan-dialog--unavailable': !state, 'audio-plan-dialog--narrow': narrow }">
      <div class="audio-plan-toolbar">
        <v-btn-toggle
          v-model="tool"
          mandatory
          borderless
          class="audio-plan-tools"
        >
          <v-btn
            v-for="t in tools"
            :key="t.name"
            :value="t.name"
            :disabled="!state"
            :class="`audio-plan-tool audio-plan-tool--${t.name}`"
            :aria-label="$t(`page.kiosk.audio.plan.tools.${t.name}`)"
          >
            <v-icon>{{ t.icon }}</v-icon>
            <span v-if="!narrow" class="audio-plan-tool-label">{{ $t(`page.kiosk.audio.plan.tools.${t.name}`) }}</span>
          </v-btn>
        </v-btn-toggle>
        <v-spacer></v-spacer>
        <v-btn icon class="audio-plan-close" :aria-label="$t('page.kiosk.audio.close')" @click="close">
          <v-icon>close</v-icon>
        </v-btn>
      </div>

      <div ref="body" class="audio-plan-body">
        <template v-if="state">
          <AudioPlanMap
            :state="state"
            :tool="tool"
            :panel-room-id="panelRoom ? panelRoom.id : null"
            @focus-stream="focusStream"
            @open-panel="openPanel"
          ></AudioPlanMap>
          <div class="audio-plan-bottom" :class="{ 'audio-plan-bottom--eq': panelRoom && tool === 'eq' }">
            <div ref="strip" class="audio-plan-strip">
              <AudioStreamCard
                v-for="stream in streams"
                :key="stream.key"
                :stream="stream"
                :selected="stream.key === selectedKey"
                :pulse="stream.key === pulseKey"
                @select="select"
              ></AudioStreamCard>
            </div>
            <!-- over the strip, so the map and the tool bar stay usable (design D2) -->
            <AudioBalancePanel
              v-if="panelRoom && tool === 'balance'"
              :key="`balance-${panelRoom.id}`"
              :room="panelRoom"
              @close="closePanel"
            ></AudioBalancePanel>
            <AudioEqPanel
              v-if="panelRoom && tool === 'eq'"
              :key="`eq-${panelRoom.id}`"
              :room="panelRoom"
              @close="closePanel"
            ></AudioEqPanel>
          </div>
        </template>
        <div v-else class="audio-plan-unavailable">
          <v-icon large>volume_off</v-icon>
          <span>{{ $t('page.kiosk.audio.unavailable') }}</span>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="js">
import { MAIN_GROUP_COLOR, WEB_PLAYER_COLOR } from '@/utils/webservices/audioService'
import { refreshPlanAppliances } from '@/utils/audioPlanAppliances'
import AudioPlanMap from '@/components/audio/AudioPlanMap.vue'
import AudioStreamCard from '@/components/audio/AudioStreamCard.vue'
import AudioBalancePanel from '@/components/audio/AudioBalancePanel.vue'
import AudioEqPanel from '@/components/audio/AudioEqPanel.vue'
import { hasBalance } from '@/utils/audioBalance'
import { hasEq } from '@/utils/audioEq'

const PULSE_MS = 1500
const HISTORY_MARK = 'audioPlanPopup'

/**
 * The audio bar's target selector: a full-screen popup with a tool bar, the
 * floor plan with every audio room and a strip of one card per stream
 * (openspec change `kiosk-audio-plan-popup`, design D7/D8). Same props and
 * events toward `KioskAudioBar` as the list it replaces: `value`, `state`,
 * `selectedKey`, `select`.
 *
 * `persistent`: a fullscreen dialog has no overlay, so without it a tap on the
 * error snackbar would close it. It closes through its close control, Escape,
 * or the device's back action, for which an extra history entry is pushed
 * while it is open.
 */
export default {
  name: 'AudioPlanDialog',

  components: {
    AudioPlanMap,
    AudioStreamCard,
    AudioBalancePanel,
    AudioEqPanel
  },

  props: {
    value: { type: Boolean, default: false },
    state: { type: Object, default: null },
    selectedKey: { type: String, default: 'main' }
  },

  data: () => ({
    tool: 'overview',
    tools: [
      { name: 'overview', icon: 'dashboard' },
      { name: 'group', icon: 'speaker_group' },
      { name: 'volume', icon: 'equalizer' },
      { name: 'light', icon: 'lightbulb' },
      { name: 'mute', icon: 'volume_off' },
      { name: 'balance', icon: 'tune' },
      { name: 'eq', icon: 'graphic_eq' }
    ],
    pulseKey: null,
    // the room whose Balance or EQ panel is open; the active tool says which
    // (openspec changes `kiosk-audio-plan-balance-tool` D2, `kiosk-audio-plan-eq-tool` D2)
    panelRoomId: null
  }),

  computed: {
    narrow () {
      return this.$vuetify.breakpoint.xsOnly
    },
    /** The open panel's room as the state has it now; null once it no longer qualifies for the active tool. */
    panelRoom () {
      if (this.panelRoomId === null || !this.state) {
        return null
      }
      const qualifies = this.tool === 'balance' ? hasBalance : this.tool === 'eq' ? hasEq : null
      if (!qualifies) {
        return null
      }
      const room = this.state.rooms.find(r => `${r.id}` === `${this.panelRoomId}`)
      return room && qualifies(room) ? room : null
    },
    /**
     * The main group, then every solo room that can be a target, then every
     * available web player in the server's order (openspec change
     * `audio-web-player-targets`, design D5). Web players never reach the map.
     */
    streams () {
      if (!this.state) {
        return []
      }
      const g = this.state.mainGroup
      const main = {
        key: 'main',
        kind: 'main',
        targetId: g.targetId,
        name: g.name || this.$t('page.kiosk.audio.mainGroup'),
        color: MAIN_GROUP_COLOR,
        playback: g.playback,
        volume: g.volume
      }
      const solo = this.state.rooms
        .filter(r => r.available && !r.grouped && !r.pinned && r.targetId)
        .map(r => ({
          key: `room:${r.id}`,
          kind: 'room',
          targetId: r.targetId,
          name: r.name,
          color: r.color,
          playback: r.playback,
          volume: r.volume
        }))
      const players = (this.state.players || [])
        .filter(p => p.available && p.targetId)
        .map(p => ({
          key: `player:${p.targetId}`,
          kind: 'player',
          targetId: p.targetId,
          name: p.name,
          color: WEB_PLAYER_COLOR,
          playback: p.playback,
          volume: p.volume
        }))
      return [main, ...solo, ...players]
    }
  },

  watch: {
    tool () {
      this.closePanel()
    },
    /** Closed for good once the room no longer qualifies, so it does not come back by itself. */
    panelRoom (room) {
      if (!room) {
        this.closePanel()
      }
    },
    value: {
      immediate: true,
      handler (open) {
        if (open) {
          this.tool = 'overview'
          refreshPlanAppliances()
          this.pushHistory()
        } else {
          this.closePanel()
          this.popHistory()
          this.clearPulse()
        }
      }
    }
  },

  methods: {
    close () {
      this.$emit('input', false)
    },
    openPanel (roomId) {
      this.panelRoomId = roomId
    },
    closePanel () {
      this.panelRoomId = null
    },
    select (key) {
      this.$emit('select', key)
      this.close()
    },
    focusStream (key) {
      this.clearPulse()
      this.pulseKey = key
      this.pulseTimer = setTimeout(() => { this.pulseKey = null }, PULSE_MS)
      this.$nextTick(() => {
        const card = this.$refs.strip && this.$refs.strip.querySelector(`[data-key="${key}"]`)
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
      })
    },
    clearPulse () {
      if (this.pulseTimer) {
        clearTimeout(this.pulseTimer)
        this.pulseTimer = null
      }
      this.pulseKey = null
    },
    pushHistory () {
      if (this.historyPushed) {
        return
      }
      try {
        window.history.pushState({ ...(window.history.state || {}), [HISTORY_MARK]: true }, '')
        this.historyPushed = true
        window.addEventListener('popstate', this.onPopState)
      } catch {
        // no history API - close control and Escape still work
      }
    },
    /** Closed by its own controls: take the extra entry off again. */
    popHistory () {
      if (!this.historyPushed) {
        return
      }
      window.removeEventListener('popstate', this.onPopState)
      this.historyPushed = false
      if (window.history.state && window.history.state[HISTORY_MARK]) {
        window.history.back()
      }
    },
    onPopState () {
      // the back action already took the entry off
      window.removeEventListener('popstate', this.onPopState)
      this.historyPushed = false
      this.close()
    }
  },

  created () {
    this.pulseTimer = null
    this.historyPushed = false
  },

  beforeDestroy () {
    this.clearPulse()
    this.popHistory()
  }
}
</script>

<style lang="scss">
.audio-plan-dialog.v-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.audio-plan-toolbar {
  display: flex;
  align-items: center;
  flex: 0 0 48px;
  height: 48px;
  padding: 0 4px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);

  .audio-plan-tools.v-btn-toggle {
    height: 44px;
    background: transparent !important;

    > .v-btn.v-btn {
      height: 44px;
      min-width: 56px;
      padding: 0 12px;
      opacity: 1;
      border-radius: 6px;
      text-transform: none;
      letter-spacing: normal;
    }

    // the theme's primary is a dark grey, too close to the bar to mark the tool
    > .v-btn.v-btn--active {
      background-color: #1976D2 !important;
      color: #fff !important;

      .v-icon {
        color: #fff !important;
      }
    }
  }

  .audio-plan-tool-label {
    margin-left: 6px;
    font-size: 14px;
  }

  .audio-plan-close.v-btn {
    width: 44px;
    height: 44px;
  }
}

// seven tools and the close control in 332 px (design D1)
.audio-plan-dialog--narrow .audio-plan-tools.v-btn-toggle > .v-btn.v-btn {
  min-width: 40px;
  padding: 0 6px;
}

// Plan at full width, the strip takes the rest but never less than 150 px;
// below that the body scrolls vertically (phone). Never sideways.
.audio-plan-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.audio-plan-bottom {
  position: relative;
  display: flex;
  flex: 1 0 150px;
  min-height: 150px;
}

// the EQ panel needs 220 px; the body scrolls where the strip is shorter (change `kiosk-audio-plan-eq-tool`, D5)
.audio-plan-bottom--eq {
  min-height: 236px;
}

.audio-plan-strip {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  gap: 8px;
  padding: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
}

.audio-plan-unavailable {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
}
</style>
