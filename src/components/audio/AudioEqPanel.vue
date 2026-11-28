<template>
  <div class="audio-eq-panel" :data-room-id="room.id" @click.stop @pointerdown.stop>
    <div class="audio-eq-panel-head">
      <v-icon small class="audio-eq-panel-icon">graphic_eq</v-icon>
      <span class="audio-eq-panel-title">{{ room.name }}</span>
      <v-spacer></v-spacer>
      <v-btn icon small class="audio-eq-panel-close" :aria-label="$t('page.kiosk.audio.close')" @click="$emit('close')">
        <v-icon>close</v-icon>
      </v-btn>
    </div>
    <v-progress-linear v-if="reading && eq" indeterminate height="2" class="audio-eq-panel-refresh"></v-progress-linear>

    <div v-if="reading && !eq" class="audio-eq-panel-state audio-eq-panel-loading">
      <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <div v-else-if="error !== null && !eq" class="audio-eq-panel-state audio-eq-panel-error">
      <span class="audio-eq-panel-reason">{{ error || $t('page.kiosk.audio.plan.eq.loadFailed') }}</span>
      <v-btn small outlined class="audio-eq-panel-retry" @click="retry">{{ $t('page.kiosk.audio.plan.eq.retry') }}</v-btn>
    </div>

    <template v-else-if="eq">
      <!-- a 503 after the panel had data: the values stay visible but cannot be changed -->
      <div v-if="error !== null" class="audio-eq-panel-error-line">
        <span class="audio-eq-panel-reason">{{ error || $t('page.kiosk.audio.plan.eq.loadFailed') }}</span>
        <v-btn x-small text class="audio-eq-panel-retry" @click="retry">{{ $t('page.kiosk.audio.plan.eq.retry') }}</v-btn>
      </div>

      <div v-if="eq.capability === 'bands'" class="audio-eq-bands">
        <div
          v-for="band in eq.bands"
          :key="bandKey(band)"
          class="audio-eq-band"
          :data-frequency="bandKey(band)"
        >
          <span class="audio-eq-band-gain">{{ formatGain(shownGain(band)) }}</span>
          <v-slider
            class="audio-eq-band-slider"
            vertical
            :value="shownGain(band)"
            :min="band.min"
            :max="band.max"
            :step="band.step"
            :disabled="disabled"
            :color="sliderColor"
            :track-color="sliderTrackColor"
            hide-details
            dense
            @input="gain => drag(band, gain)"
            @change="gain => release(band, gain)"
          ></v-slider>
          <span class="audio-eq-band-label">{{ frequencyLabel(band.frequency) }}</span>
        </div>
      </div>

      <div v-else-if="eq.capability === 'crossover'" class="audio-eq-crossover">
        <div class="audio-eq-crossover-choices">
          <v-btn
            v-for="choice in crossoverChoices"
            :key="choice.key"
            small
            depressed
            :disabled="disabled"
            class="audio-eq-crossover-choice"
            :class="{ 'audio-eq-crossover-choice--active': choice.value === shownCrossover }"
            :data-value="choice.key"
            @click="chooseCrossover(choice.value)"
          >{{ choice.label }}</v-btn>
        </div>
        <div class="audio-eq-speakers">
          <div
            v-for="speaker in eq.speakers"
            :key="speaker.playerId"
            class="audio-eq-speaker"
            :class="{ 'audio-eq-speaker--mismatch': mismatch(speaker) }"
            :data-player-id="speaker.playerId"
          >
            <span class="audio-eq-speaker-name">{{ speaker.name }}</span>
            <span class="audio-eq-speaker-role">{{ roleLabel(speaker.role) }}</span>
            <span class="audio-eq-speaker-presets">{{ presetsOf(speaker) }}</span>
            <v-icon v-if="mismatch(speaker)" x-small color="warning" class="audio-eq-speaker-mark" :title="$t('page.kiosk.audio.plan.eq.presetMismatch')">warning</v-icon>
          </div>
        </div>
      </div>

      <div class="audio-eq-footer">
        <v-btn
          small
          :outlined="!resetArmed"
          :color="resetArmed ? 'warning' : undefined"
          :depressed="resetArmed"
          :disabled="disabled"
          class="audio-eq-reset"
          :class="{ 'audio-eq-reset--armed': resetArmed }"
          @click="resetTap"
        >
          <v-icon small left>settings_backup_restore</v-icon>
          {{ resetArmed ? $t('page.kiosk.audio.plan.eq.resetConfirm') : resetLabel }}
        </v-btn>
        <div class="audio-eq-footer-text">
          <span v-if="speakerLine" class="audio-eq-footer-speakers">{{ speakerLine }}</span>
          <span class="audio-eq-footer-note">{{ $t('page.kiosk.audio.plan.eq.serverOverwrites') }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="js">
import { volumeSliderColors } from '@/utils/audioVolumeColors'
import { singleton as audioService } from '@/utils/webservices/audioService'
import { SseClient } from '@/utils/sseClient'
import { eqBandKey, eqFrequencyLabel } from '@/utils/audioEq'

/** Own `audio-eq-changed` events arrive this long after a write at the latest (design D7). */
const ECHO_WINDOW_MS = 1500
/** How long the armed reset waits for its second tap (design D5). */
const RESET_ARM_MS = 4000

/**
 * The audio plan popup's EQ panel for one room (openspec change
 * `kiosk-audio-plan-eq-tool`, design D5-D7): the room's bands or crossover as
 * the server reads them live from the speakers, read once on open and again
 * only on an SSE `audio-eq-changed` from elsewhere, a reconnect, a `400` or
 * *retry*. Writes are sent on release, only for what changed, one at a time;
 * whatever changes meanwhile is merged and sent next. Only this panel puts its
 * failures on screen (`axiosUtils` raises none). The dialog decides when it
 * closes; `close` asks it to.
 */
export default {
  name: 'AudioEqPanel',

  props: {
    // an AudioRoom whose `eq` is bands, crossover or unavailable
    room: { type: Object, required: true }
  },

  data: () => ({
    eq: null,
    reading: false,
    // null: no error; '' : an error without a reason; else the server's reason
    error: null,
    // frequency key -> gain, released but not sent yet
    pending: {},
    // frequency key -> gain, in the write running now
    inFlight: {},
    // frequency key -> gain under the finger, before release
    dragging: {},
    // { value } once a crossover was chosen but not sent; null when none waits
    pendingCrossover: null,
    inFlightCrossover: null,
    pendingReset: false,
    writing: false,
    resetArmed: false
  }),

  computed: {
    sliderColor () {
      return volumeSliderColors(this.$vuetify.theme.dark).color
    },
    sliderTrackColor () {
      return volumeSliderColors(this.$vuetify.theme.dark).trackColor
    },
    disabled () {
      return this.error !== null
    },
    shownCrossover () {
      if (this.pendingCrossover) {
        return this.pendingCrossover.value
      }
      if (this.inFlightCrossover) {
        return this.inFlightCrossover.value
      }
      return this.eq ? this.eq.crossover : null
    },
    crossoverChoices () {
      const flat = { key: 'flat', value: null, label: this.$t('page.kiosk.audio.plan.eq.flat') }
      return [flat, ...(this.eq ? this.eq.frequencies : []).map(f => ({ key: `${f}`, value: f, label: `${f}` }))]
    },
    resetLabel () {
      return this.eq && this.eq.capability === 'crossover'
        ? this.$t('page.kiosk.audio.plan.eq.resetCrossover')
        : this.$t('page.kiosk.audio.plan.eq.resetBands')
    },
    speakerLine () {
      if (!this.eq || !this.eq.speakers.length) {
        return ''
      }
      const list = this.eq.speakers.map(s => (s.host ? `${s.name} (${s.host})` : s.name)).join(', ')
      return this.$t('page.kiosk.audio.plan.eq.speakers', { list })
    }
  },

  watch: {
    /** A switch between bands, crossover and unavailable changes what the panel can show. */
    'room.eq' (now, before) {
      if (now !== before) {
        this.read()
      }
    }
  },

  methods: {
    bandKey (band) {
      return eqBandKey(band.frequency)
    },
    frequencyLabel (frequency) {
      return eqFrequencyLabel(frequency)
    },
    formatGain (gain) {
      return gain > 0 ? `+${gain}` : `${gain}`
    },
    /** Under the finger, else waiting, else being sent, else the server's (design D6). */
    shownGain (band) {
      const key = this.bandKey(band)
      for (const map of [this.dragging, this.pending, this.inFlight]) {
        if (Object.prototype.hasOwnProperty.call(map, key)) {
          return map[key]
        }
      }
      return band.gain
    },
    drag (band, gain) {
      this.$set(this.dragging, this.bandKey(band), gain)
    },
    /** `change` fires once on release (or a tap on the track). */
    release (band, gain) {
      const key = this.bandKey(band)
      this.$delete(this.dragging, key)
      // what the speakers have, or will have once the running write is through
      const base = Object.prototype.hasOwnProperty.call(this.inFlight, key) ? this.inFlight[key] : band.gain
      if (gain === base) {
        this.$delete(this.pending, key)
      } else {
        this.$set(this.pending, key, gain)
      }
      this.flush()
    },
    chooseCrossover (value) {
      if (value === this.shownCrossover) {
        return
      }
      const base = this.inFlightCrossover ? this.inFlightCrossover.value : (this.eq ? this.eq.crossover : null)
      // what the speakers have, or will have once the running write is through
      this.pendingCrossover = value === base ? null : { value }
      this.flush()
    },
    resetTap () {
      if (!this.resetArmed) {
        this.resetArmed = true
        this.clearResetTimer()
        this.resetTimer = setTimeout(() => {
          this.resetTimer = null
          this.resetArmed = false
        }, RESET_ARM_MS)
        return
      }
      this.clearResetTimer()
      this.resetArmed = false
      // the reset replaces whatever waits (design D6)
      this.pending = {}
      this.pendingCrossover = null
      this.pendingReset = true
      this.flush()
    },
    clearResetTimer () {
      if (this.resetTimer) {
        clearTimeout(this.resetTimer)
        this.resetTimer = null
      }
    },

    /** One write at a time: a reset first, then the merged bands, then a crossover. */
    async flush () {
      if (this.writing || this.destroyed) {
        return
      }
      const roomId = this.room.id
      let call
      let reset = false
      if (this.pendingReset) {
        this.pendingReset = false
        reset = true
        call = () => audioService.resetRoomEq(roomId)
      } else if (Object.keys(this.pending).length) {
        const bands = { ...this.pending }
        this.inFlight = bands
        this.pending = {}
        call = () => audioService.setRoomEq(roomId, { bands })
      } else if (this.pendingCrossover) {
        this.inFlightCrossover = this.pendingCrossover
        this.pendingCrossover = null
        const crossover = this.inFlightCrossover.value
        call = () => audioService.setRoomEq(roomId, { crossover })
      } else {
        return
      }
      this.writing = true
      let reread = false
      try {
        await call()
        this.settle()
        reread = reset
      } catch (err) {
        reread = this.handleWriteFailure(err)
      } finally {
        this.inFlight = {}
        this.inFlightCrossover = null
        this.writing = false
        this.lastWriteEnd = Date.now()
      }
      if (this.destroyed) {
        return
      }
      if (reread) {
        this.read()
      }
      this.flush()
    },
    /** The server took the write (also a 502, which saves the desired value): it is now the server's. */
    settle () {
      if (!this.eq) {
        return
      }
      this.eq.bands.forEach(band => {
        const key = this.bandKey(band)
        if (Object.prototype.hasOwnProperty.call(this.inFlight, key)) {
          band.gain = this.inFlight[key]
        }
      })
      if (this.inFlightCrossover) {
        this.eq.crossover = this.inFlightCrossover.value
      }
    },
    /** Answers as design D6 lists them; true when the EQ has to be read again. */
    handleWriteFailure (err) {
      const status = err && err.status
      const reason = (err && err.serverReason) || ''
      switch (status) {
        case 502:
          this.settle()
          this.notify('warning', 'page.kiosk.audio.plan.eq.partlyFailed', reason)
          return false
        case 400:
          this.notify('error', 'page.kiosk.audio.plan.eq.writeFailed', reason)
          return true
        case 404:
        case 409:
          this.$emit('close')
          return false
        case 503:
          this.error = reason
          return false
        default:
          this.notify('error', 'page.kiosk.audio.plan.eq.writeFailed', reason)
          return true
      }
    },
    notify (color, descriptionTKey, message) {
      this.$store.dispatch('gui/snackbar/snackbarEnqueue', {
        color,
        headingTKey: `message.${color}.heading`,
        descriptionTKey,
        status: null,
        message
      })
    },

    /** Reads the EQ; a later read wins over one still running. */
    async read () {
      const seq = ++this.readSeq
      this.reading = true
      try {
        const eq = await audioService.getRoomEq(this.room.id)
        if (seq !== this.readSeq || this.destroyed) {
          return
        }
        // pending and in-flight values are shown over these, so nothing waiting jumps back (design D7)
        this.eq = eq
        this.error = null
      } catch (err) {
        if (seq !== this.readSeq || this.destroyed) {
          return
        }
        const status = err && err.status
        if (status === 404 || status === 409) {
          this.$emit('close')
          return
        }
        this.error = (err && err.serverReason) || ''
      } finally {
        if (seq === this.readSeq) {
          this.reading = false
        }
      }
    },
    retry () {
      this.error = null
      this.read()
    },
    /** Pending and in-flight values stay, so a reread never loses a change. */
    onEqChanged (payload) {
      const roomId = payload && payload.roomId != null ? `${payload.roomId}` : null
      if (roomId !== `${this.room.id}`) {
        return
      }
      if (this.writing || Date.now() - this.lastWriteEnd < ECHO_WINDOW_MS) {
        // most likely this panel's own write (design D7)
        return
      }
      this.read()
    },
    onReconnected () {
      // events may have been missed while the connection was down
      if (!this.writing) {
        this.read()
      }
    },
    mismatch (speaker) {
      const f = this.shownCrossover
      if (f === null || !speaker.role) {
        return false
      }
      const expected = speaker.role === 'sub' ? `LF ${f}Hz` : `HF ${f}Hz`
      return [speaker.leftPreset, speaker.rightPreset].some(p => p !== null && p !== expected)
    },
    roleLabel (role) {
      if (role === 'satellite') {
        return this.$t('page.kiosk.audio.plan.eq.roleSatellite')
      }
      if (role === 'sub') {
        return this.$t('page.kiosk.audio.plan.eq.roleSub')
      }
      return role || ''
    },
    presetsOf (speaker) {
      const l = speaker.leftPreset
      const r = speaker.rightPreset
      if (l === null && r === null) {
        return '–'
      }
      if (l === r) {
        return l
      }
      return `L ${l || '–'} · R ${r || '–'}`
    }
  },

  created () {
    this.readSeq = 0
    this.lastWriteEnd = 0
    this.resetTimer = null
    this.destroyed = false
    const sse = SseClient.getInstance()
    sse.addEventListener('audio-eq-changed', this.onEqChanged)
    sse.addEventListener('connected', this.onReconnected)
    this.read()
  },

  mounted () {
    // the panel's 220 px may reach below a short strip (1020 x 590): bring it into view
    this.$nextTick(() => {
      if (this.$el && this.$el.scrollIntoView) {
        this.$el.scrollIntoView({ block: 'nearest' })
      }
    })
  },

  beforeDestroy () {
    this.destroyed = true
    this.clearResetTimer()
    const sse = SseClient.getInstance()
    sse.removeEventListener('audio-eq-changed', this.onEqChanged)
    sse.removeEventListener('connected', this.onReconnected)
  }
}
</script>

<style lang="scss">
// fills the strip, at least 220 px; the dialog lets the body scroll where the strip is shorter (design D5)
.audio-eq-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  min-height: 220px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  margin: 8px;
  border-radius: 6px;
  overflow: hidden;
  background-color: var(--v-background-base, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  cursor: default;
}

.theme--dark .audio-eq-panel {
  background-color: #2b2b2b;
}

.audio-eq-panel-head {
  display: flex;
  align-items: center;
  flex: 0 0 40px;
  padding: 0 4px 0 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);

  .audio-eq-panel-icon.v-icon {
    margin-right: 6px;
  }

  .audio-eq-panel-title {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .audio-eq-panel-close.v-btn {
    width: 40px;
    height: 40px;
  }
}

.audio-eq-panel-refresh.v-progress-linear {
  flex: 0 0 2px;
}

.audio-eq-panel-state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  text-align: center;
}

.audio-eq-panel-reason {
  font-size: 13px;
}

.audio-eq-panel-error-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 2px 12px;
  color: var(--v-error-base, #E53935);
}

.audio-eq-bands {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding: 2px 4px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
}

.audio-eq-band {
  display: flex;
  flex: 1 0 40px;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
  min-height: 0;

  .audio-eq-band-gain,
  .audio-eq-band-label {
    flex: 0 0 16px;
    font-size: 12px;
    line-height: 16px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .audio-eq-band-label {
    opacity: 0.75;
  }

  // Vuetify gives a vertical slider 150 px; here it takes what the panel has
  .audio-eq-band-slider.v-input {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    margin: 0;

    .v-input__control,
    .v-input__slot,
    .v-slider {
      height: 100%;
      min-height: 0;
    }

    .v-slider--vertical {
      min-height: 0;
      margin: 8px 0;
    }
  }
}

.audio-eq-crossover {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 12px;
}

.audio-eq-crossover-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  .audio-eq-crossover-choice.v-btn {
    min-width: 48px;
    height: 36px;
    text-transform: none;
    letter-spacing: normal;
  }

  .audio-eq-crossover-choice--active.v-btn {
    background-color: #1976D2 !important;
    color: #fff !important;
  }
}

.audio-eq-speakers {
  margin-top: 8px;
}

.audio-eq-speaker {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  font-size: 13px;

  .audio-eq-speaker-name {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .audio-eq-speaker-role {
    flex: 0 0 auto;
    opacity: 0.7;
  }

  .audio-eq-speaker-presets {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
  }

  &.audio-eq-speaker--mismatch .audio-eq-speaker-presets {
    color: var(--v-warning-base, #FB8C00);
  }
}

.audio-eq-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  padding: 4px 12px 6px;
  border-top: 1px solid rgba(128, 128, 128, 0.25);

  .audio-eq-reset.v-btn {
    flex: 0 0 auto;
    text-transform: none;
    letter-spacing: normal;
  }

  .audio-eq-footer-text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
    font-size: 11px;
    line-height: 14px;
    opacity: 0.75;

    > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
