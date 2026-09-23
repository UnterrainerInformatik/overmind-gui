<template>
  <v-dialog
    :value="value"
    max-width="560"
    :fullscreen="$vuetify.breakpoint.xsOnly"
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card class="recording-job-dialog">
      <v-card-title>
        {{ $t('page.kiosk.cameras.recordingJob.title', { name: camera ? camera.displayName : '' }) }}
      </v-card-title>

      <v-card-text>
        <!-- Above every view: a refused start is answered by a re-read, which
             may turn this very dialog into the running job the server named.
             Filled rather than outlined: the reason has to be read, and this
             theme's error red as text on a dark card cannot be. -->
        <v-alert v-if="refusal" dense type="error" class="recording-job-refusal">
          {{ refusal }}
        </v-alert>

        <!-- The job state could not be read: no form, because a start made
             blind would only be refused if a job exists. -->
        <template v-if="window === undefined">
          <div class="recording-job-unknown mb-2">{{ $t('page.kiosk.cameras.recordingJob.unknown') }}</div>
          <v-btn outlined small class="recording-job-retry" :loading="reading" @click="retry">
            {{ $t('page.kiosk.cameras.recordingJob.retry') }}
          </v-btn>
        </template>

        <!-- A running job. -->
        <template v-else-if="window">
          <div class="recording-job-running">
            <div class="recording-job-fact">
              <span class="recording-job-label">{{ $t('page.kiosk.cameras.recordingJob.endsAt') }}</span>
              <span class="recording-job-end">{{ endText(window) }}</span>
            </div>
            <div class="recording-job-fact">
              <span class="recording-job-label">{{ $t('page.kiosk.cameras.recordingJob.remaining') }}</span>
              <span class="recording-job-remaining">{{ remainingText(window) }}</span>
            </div>
            <div class="recording-job-fact">
              <span class="recording-job-label">{{ $t('page.kiosk.cameras.recordingJob.storage') }}</span>
              <span class="recording-job-storage">{{ storageText(window.storageChoice) }}</span>
            </div>
            <div class="recording-job-no-second text-caption mt-2">
              {{ $t('page.kiosk.cameras.recordingJob.oneAtATime') }}
            </div>
          </div>
        </template>

        <!-- No job: the start form. -->
        <template v-else>
          <div class="recording-job-label mb-1">{{ $t('page.kiosk.cameras.recordingJob.endLabel') }}</div>
          <div class="recording-job-quick d-flex flex-wrap mb-2">
            <v-btn
              v-for="quick in QUICK_DURATIONS"
              :key="quick.key"
              small
              outlined
              class="recording-job-quick-btn mr-2 mb-1"
              @click="pickQuick(quick.hours)"
            >{{ $t(`page.kiosk.cameras.recordingJob.quick.${quick.key}`) }}</v-btn>
          </div>
          <input
            v-model="endLocal"
            type="datetime-local"
            class="recording-job-end-input"
            :style="{ colorScheme: $vuetify.theme.dark ? 'dark' : 'light' }"
          />
          <div v-if="endProblem" class="recording-job-end-problem warning--text text-caption mt-1">
            {{ endProblem }}
          </div>

          <div class="recording-job-label mt-4 mb-1">{{ $t('page.kiosk.cameras.recordingJob.storage') }}</div>
          <v-radio-group v-model="storageChoice" class="recording-job-storage-choice mt-0" hide-details>
            <v-radio value="local" class="recording-job-choice-local">
              <template v-slot:label>
                <div>
                  <div class="recording-job-choice-title">{{ $t('page.kiosk.cameras.recordingJob.local') }}</div>
                  <div class="recording-job-choice-note text-caption">
                    {{ $t('page.kiosk.cameras.recordingJob.localNote') }}
                  </div>
                </div>
              </template>
            </v-radio>
            <v-radio value="central" class="recording-job-choice-central mt-2">
              <template v-slot:label>
                <div>
                  <div class="recording-job-choice-title">{{ $t('page.kiosk.cameras.recordingJob.central') }}</div>
                  <div class="recording-job-choice-note text-caption">
                    {{ $t('page.kiosk.cameras.recordingJob.centralNote') }}
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>

          <div v-if="estimate" class="recording-job-estimate mt-4">
            <div>
              {{ $t('page.kiosk.cameras.recordingJob.estimate', { gb: estimate.gb }) }}
              <span v-if="estimate.ruleOfThumb" class="recording-job-rule-of-thumb">
                {{ $t('page.kiosk.cameras.recordingJob.ruleOfThumb') }}
              </span>
            </div>
            <div v-if="storageChoice === 'central'" class="recording-job-uplink warning--text text-caption mt-1">
              {{ $t('page.kiosk.cameras.recordingJob.uplink', { gb: estimate.gb }) }}
            </div>
          </div>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text class="recording-job-close" @click="$emit('input', false)">
          {{ $t('page.kiosk.cameras.recordingJob.close') }}
        </v-btn>
        <v-btn
          v-if="window"
          text
          color="error"
          class="recording-job-end-btn"
          :loading="busy"
          @click="requestEnd"
        >{{ $t('page.kiosk.cameras.recordingJob.end') }}</v-btn>
        <v-btn
          v-else-if="window === null"
          text
          color="primary"
          class="recording-job-start-btn"
          :loading="busy"
          :disabled="!!endProblem"
          @click="start"
        >{{ $t('page.kiosk.cameras.recordingJob.start') }}</v-btn>
      </v-card-actions>
    </v-card>

    <ConfirmDialog
      ref="confirmDialog"
      :confirmText="$t('page.kiosk.cameras.recordingJob.end')"
      :cancelText="$t('page.kiosk.cameras.cancel')"
    ></ConfirmDialog>
  </v-dialog>
</template>

<script lang="js">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { durationText } from '@/mixins/durationText'
import { singleton as cameraUtils } from '@/utils/cameraUtils'
import { singleton as dateUtils } from '@/utils/dateUtils'
import { singleton as recordingJobsService } from '@/utils/webservices/recordingJobsService'

const QUICK_DURATIONS = [
  { key: 'hour', hours: 1 },
  { key: 'day', hours: 24 },
  { key: 'week', hours: 24 * 7 }
]

/** How often the open dialog re-reads the clock, for its countdown and its end check. */
const CLOCK_MS = 15000

/** See KioskPersonenEvents.vue - the `YYYY-MM-DDTHH:mm` local string a `datetime-local` input takes. */
const localFromDate = date =>
  `${date.getFullYear()}-${dateUtils.pad(date.getMonth() + 1)}-${dateUtils.pad(date.getDate())}` +
  `T${dateUtils.pad(date.getHours())}:${dateUtils.pad(date.getMinutes())}`

/**
 * One camera's recording job (openspec change `camera-recording-jobs`, design.md
 * D4): the start form while there is no job, the running job with an early end
 * while there is one, and a retry while the state could not be read.
 *
 * `window` is what the Kameras page read: the active window, `null` for no job,
 * or `undefined` for "could not be read" - never confused with "no job". The
 * dialog holds no copy of it. Every start, end, refusal and retry emits
 * `changed`, the page re-reads that camera, and the new prop picks the view.
 */
export default {
  name: 'CameraRecordingJobDialog',

  mixins: [durationText],

  components: {
    ConfirmDialog
  },

  props: {
    value: { type: Boolean, default: false },
    camera: { type: Object, default: null },
    // no `type`: undefined is a value this prop carries on purpose
    window: { default: undefined },
    // whether the page is re-reading this camera's jobs right now
    reading: { type: Boolean, default: false }
  },

  data: () => ({
    QUICK_DURATIONS,
    endLocal: '',
    storageChoice: 'local',
    refusal: null,
    busy: false,
    clock: Date.now(),
    clockTimer: null
  }),

  computed: {
    nowSeconds () {
      return this.clock / 1000
    },

    endEpoch () {
      if (!this.endLocal) {
        return null
      }
      const ms = new Date(this.endLocal).getTime()
      return Number.isFinite(ms) ? Math.floor(ms / 1000) : null
    },

    /** Why the start is unavailable, or null when it is not. */
    endProblem () {
      if (this.endEpoch === null) {
        return this.$t('page.kiosk.cameras.recordingJob.endMissing')
      }
      return this.endEpoch <= this.nowSeconds ? this.$t('page.kiosk.cameras.recordingJob.endInPast') : null
    },

    estimate () {
      if (this.endProblem) {
        return null
      }
      const hours = (this.endEpoch - this.nowSeconds) / 3600
      const volume = cameraUtils.recordingVolumeBytes(cameraUtils.recordBitrateKbps(this.camera), hours)
      return { gb: cameraUtils.volumeGigabytes(volume.bytes), ruleOfThumb: volume.ruleOfThumb }
    }
  },

  watch: {
    value: {
      immediate: true,
      handler (open) {
        if (open) {
          // a fresh form per opening; a refused start keeps its values only
          // while the dialog stays open, which is where the user corrects it
          this.endLocal = ''
          this.storageChoice = 'local'
          this.refusal = null
          this.busy = false
          this.startClock()
        } else {
          this.stopClock()
        }
      }
    }
  },

  beforeDestroy () {
    this.stopClock()
  },

  methods: {
    startClock () {
      this.clock = Date.now()
      if (!this.clockTimer) {
        this.clockTimer = setInterval(() => { this.clock = Date.now() }, CLOCK_MS)
      }
    },

    stopClock () {
      if (this.clockTimer) {
        clearInterval(this.clockTimer)
        this.clockTimer = null
      }
    },

    pickQuick (hours) {
      this.clock = Date.now()
      this.endLocal = localFromDate(new Date(this.clock + hours * 3600000))
    },

    endText (job) {
      return job.endTime === null
        ? ''
        : dateUtils.dateToShortDateTime(new Date(job.endTime * 1000), this.$i18n.locale)
    },

    remainingText (job) {
      if (job.endTime === null) {
        return ''
      }
      const hours = (job.endTime - this.nowSeconds) / 3600
      return hours <= 0 ? this.$t('page.kiosk.cameras.recordingJob.ending') : this.duration(hours)
    },

    storageText (choice) {
      return choice === 'central'
        ? this.$t('page.kiosk.cameras.recordingJob.central')
        : this.$t('page.kiosk.cameras.recordingJob.local')
    },

    /**
     * The server's reason, verbatim - `serverReason` rather than
     * `serverMessage`, which a refusal without a body fills with axios' own
     * text; that case gets the general message instead.
     */
    refusalOf (err) {
      return (err && err.serverReason) || this.$t('page.kiosk.cameras.recordingJob.failed')
    },

    async start () {
      this.clock = Date.now()
      if (this.endProblem || !this.camera) {
        return
      }
      this.busy = true
      this.refusal = null
      try {
        await recordingJobsService.start(this.camera.id, this.endEpoch, this.storageChoice)
        this.$emit('changed', this.camera.id)
        this.$emit('input', false)
      } catch (err) {
        // the form keeps what was entered; the re-read shows a job that was
        // started elsewhere, if that is why the server said no
        this.refusal = this.refusalOf(err)
        this.$emit('changed', this.camera.id)
      }
      this.busy = false
    },

    requestEnd () {
      const job = this.window
      this.$refs.confirmDialog.open(
        this.$t('page.kiosk.cameras.recordingJob.endConfirm', { name: this.camera.displayName }),
        () => this.end(job)
      )
    },

    async end (job) {
      this.busy = true
      this.refusal = null
      try {
        await recordingJobsService.end(this.camera.id, job.id)
        this.$emit('changed', this.camera.id)
        this.$emit('input', false)
      } catch (err) {
        this.refusal = this.refusalOf(err)
        this.$emit('changed', this.camera.id)
      }
      this.busy = false
    },

    retry () {
      this.$emit('changed', this.camera.id)
    }
  }
}
</script>

<style lang="scss">
.recording-job-label {
  font-weight: 500;
}

.recording-job-fact {
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
  margin-bottom: 4px;
}

.recording-job-fact .recording-job-label {
  min-width: 120px;
}

.recording-job-end-input {
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  padding: 4px 8px;
  font-size: 14px;
  max-width: 100%;
}

/* the consequence text belongs to its label, not to the radio's single line */
.recording-job-storage-choice .v-label {
  height: auto;
  align-items: flex-start;
}

.recording-job-choice-note {
  white-space: normal;
  line-height: 1.35;
}
</style>
