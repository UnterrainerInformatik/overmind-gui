<template>
  <v-dialog
    :value="value"
    max-width="720"
    :fullscreen="$vuetify.breakpoint.xsOnly"
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card v-if="draft" class="stream-settings">
      <v-card-title>{{ $t('page.kiosk.cameras.streams.title', { name: camera.displayName }) }}</v-card-title>
      <v-card-text>
        <!-- ---------------------------------------------------------------
             The streams themselves. A stream that was never probed shows its
             parameters as unknown rather than as zeros - see `probedAt`.
        ---------------------------------------------------------------- -->
        <div class="text-subtitle-1 mb-2">{{ $t('page.kiosk.cameras.streams.streamsTitle') }}</div>

        <v-card
          v-for="stream in draft.streams"
          :key="stream.name"
          outlined
          class="pa-3 mb-3 stream-entry"
          :data-stream="stream.name"
        >
          <div class="d-flex align-center flex-wrap mb-2">
            <span class="text-subtitle-2 mr-2">{{ stream.name }}</span>
            <v-chip
              v-for="role in rolesOf(stream.name)"
              :key="role"
              x-small
              outlined
              color="primary"
              class="mr-1"
            >{{ $t('page.kiosk.cameras.streams.role' + capitalized(role)) }}</v-chip>
            <v-spacer></v-spacer>
            <v-btn
              small
              text
              :loading="!!probing[stream.name]"
              class="stream-probe-btn"
              @click="probe(stream)"
            >{{ $t('page.kiosk.cameras.streams.probe') }}</v-btn>
            <v-btn
              icon
              small
              class="stream-remove-btn"
              :title="$t('page.kiosk.cameras.streams.removeStream')"
              @click="removeStream(stream)"
            >
              <v-icon small color="error">delete</v-icon>
            </v-btn>
          </div>

          <v-text-field
            v-model="stream.url"
            :label="$t('page.kiosk.cameras.streams.streamUrl')"
            dense
            outlined
            hide-details="auto"
            class="mb-2 stream-url"
          ></v-text-field>

          <v-alert v-if="probeErrors[stream.name]" dense outlined type="error" class="mb-2 stream-probe-error">
            {{ $t('page.kiosk.cameras.streams.probeFailed', { reason: probeErrors[stream.name] }) }}
            <span v-if="stream.probedAt">
              {{ $t('page.kiosk.cameras.streams.probeFailedKept') }}
            </span>
          </v-alert>

          <div v-if="!stream.probedAt" class="stream-unprobed text--disabled mb-1">
            {{ $t('page.kiosk.cameras.streams.notProbed') }}
          </div>
          <div v-else class="stream-probed-at text--disabled mb-1">
            {{ $t('page.kiosk.cameras.streams.probedAt', { at: shortTime(stream.probedAt) }) }}
          </div>

          <div class="d-flex flex-wrap stream-param">
            <div v-for="field in parameterFields" :key="field.key" class="stream-param-field mr-3 mb-1">
              <v-text-field
                v-if="isSettable(stream, field.key)"
                v-model="stream[field.key]"
                :label="$t('page.kiosk.cameras.streams.' + field.key)"
                :type="field.numeric ? 'number' : 'text'"
                dense
                outlined
                hide-details="auto"
                class="stream-param-input"
              ></v-text-field>
              <span v-else>
                {{ $t('page.kiosk.cameras.streams.' + field.key) }}:
                <span :class="{ 'text--disabled': stream[field.key] === null }">{{ parameterText(stream, field.key) }}</span>
              </span>
            </div>
          </div>
          <div v-if="!isAnySettable(stream)" class="stream-readonly-note text--disabled mt-1">
            {{ $t('page.kiosk.cameras.streams.readOnlyNote') }}
          </div>
        </v-card>

        <div class="d-flex align-center flex-wrap mb-2">
          <v-text-field
            v-model="newStreamName"
            :label="$t('page.kiosk.cameras.streams.streamName')"
            dense
            outlined
            hide-details="auto"
            class="mr-2 new-stream-name"
            style="max-width: 160px"
          ></v-text-field>
          <v-text-field
            v-model="newStreamUrl"
            :label="$t('page.kiosk.cameras.streams.streamUrl')"
            dense
            outlined
            hide-details="auto"
            class="mr-2 new-stream-url"
          ></v-text-field>
          <v-btn small text color="primary" class="add-stream-btn" @click="addStream">
            {{ $t('page.kiosk.cameras.streams.addStream') }}
          </v-btn>
        </div>

        <v-alert v-if="streamError" dense outlined type="warning" class="mb-3 stream-error">
          {{ streamError }}
        </v-alert>

        <!-- ---------------------------------------------------------------
             Which stream serves which purpose. Several purposes on one stream
             is the normal case for a single-stream camera, so it is not a
             warning - the note below simply states it.
        ---------------------------------------------------------------- -->
        <div class="text-subtitle-1 mb-2 mt-4">{{ $t('page.kiosk.cameras.streams.rolesTitle') }}</div>
        <div class="role-assignment">
          <v-select
            v-for="role in roleOrder"
            :key="role"
            v-model="draft.roles[role]"
            :items="streamNames"
            :label="$t('page.kiosk.cameras.streams.role' + capitalized(role))"
            :class="'role-select role-select-' + role"
            dense
            outlined
            hide-details="auto"
          ></v-select>
        </div>
        <div v-if="draft.streams.length === 1" class="text--disabled mt-1 single-stream-note">
          {{ $t('page.kiosk.cameras.streams.singleStreamNote') }}
        </div>

        <v-alert v-if="detectAdvisory" dense outlined type="warning" class="mt-2 mb-0 detect-advisory">
          {{ detectAdvisory }}
        </v-alert>

        <!-- ---------------------------------------------------------------
             Recording. Retention and mode are only settings while recording is
             on; off, they are stated as not applicable rather than shown as
             active values the user is expected to read.
        ---------------------------------------------------------------- -->
        <div class="text-subtitle-1 mb-0 mt-6">{{ $t('page.kiosk.cameras.streams.recordingTitle') }}</div>
        <div v-if="!camera.settingsReported" class="text--disabled mb-2 settings-unreported">
          {{ $t('page.kiosk.cameras.streams.settingsNotReported') }}
        </div>
        <v-switch
          v-model="draft.recording.enabled"
          :label="$t('page.kiosk.cameras.streams.recordingEnabled')"
          dense
          hide-details="auto"
          class="mt-2 recording-enabled"
        ></v-switch>
        <div v-if="!draft.recording.enabled" class="text--disabled mt-2 recording-off-note">
          {{ $t('page.kiosk.cameras.streams.recordingOffNote') }}
        </div>
        <template v-else>
          <v-radio-group v-model="draft.recording.mode" dense hide-details="auto" class="mt-2 recording-mode">
            <v-radio :label="$t('page.kiosk.cameras.streams.modeEvents')" value="events"></v-radio>
            <v-radio :label="$t('page.kiosk.cameras.streams.modeContinuous')" value="continuous"></v-radio>
          </v-radio-group>
          <v-text-field
            v-model.number="draft.recording.retentionDays"
            type="number"
            :label="$t('page.kiosk.cameras.streams.retentionDays')"
            dense
            outlined
            hide-details="auto"
            class="mt-3 retention-days"
            style="max-width: 220px"
          ></v-text-field>
          <!-- An unset retention is not unknown: the node applies its own
               default, so the page names it rather than leaving the field
               reading as a gap. -->
          <div v-if="retentionHint" class="text--disabled mt-1 retention-hint">
            {{ retentionHint }}
          </div>
          <div v-if="draft.recording.mode === 'continuous'" class="mt-2 storage-estimate">
            <span v-if="storageEstimate !== null">
              {{ $t('page.kiosk.cameras.streams.storageEstimate', { gb: storageEstimate }) }}
            </span>
            <span v-else class="text--disabled">
              {{ $t('page.kiosk.cameras.streams.storageUnknown') }}
            </span>
          </div>
        </template>

        <!-- ---------------------------------------------------------------
             Detection. Both advisories are advisory: an installation may know
             better than this page, so neither blocks the save.
        ---------------------------------------------------------------- -->
        <div class="text-subtitle-1 mb-2 mt-6">{{ $t('page.kiosk.cameras.streams.detectTitle') }}</div>
        <div class="d-flex flex-wrap">
          <v-text-field
            v-model.number="draft.detect.width"
            type="number"
            :label="$t('page.kiosk.cameras.streams.detectWidth')"
            dense
            outlined
            hide-details="auto"
            class="mr-2 mb-2 detect-width"
            style="max-width: 160px"
          ></v-text-field>
          <v-text-field
            v-model.number="draft.detect.height"
            type="number"
            :label="$t('page.kiosk.cameras.streams.detectHeight')"
            dense
            outlined
            hide-details="auto"
            class="mr-2 mb-2 detect-height"
            style="max-width: 160px"
          ></v-text-field>
          <v-text-field
            v-model.number="draft.detect.fps"
            type="number"
            :label="$t('page.kiosk.cameras.streams.detectFps')"
            dense
            outlined
            hide-details="auto"
            class="mr-2 mb-2 detect-fps"
            style="max-width: 160px"
          ></v-text-field>
        </div>
        <v-alert v-if="detectResolutionAdvisory" dense outlined type="warning" class="mb-2 detect-resolution-advisory">
          {{ detectResolutionAdvisory }}
        </v-alert>

        <v-switch
          v-model="draft.detect.audioEnabled"
          :label="$t('page.kiosk.cameras.streams.detectAudio')"
          dense
          hide-details="auto"
          class="mt-0 detect-audio"
        ></v-switch>
        <v-alert v-if="audioAdvisory" dense outlined type="warning" class="mt-2 mb-2 detect-audio-advisory">
          {{ audioAdvisory }}
        </v-alert>

        <div class="mt-4">{{ $t('page.kiosk.cameras.streams.motionThreshold') }}</div>
        <v-slider
          v-model="motionThresholdValue"
          :min="0"
          :max="100"
          :hint="$t('page.kiosk.cameras.streams.motionThresholdHint')"
          persistent-hint
          thumb-label
          class="motion-threshold"
        ></v-slider>

        <v-alert v-if="saveError" dense outlined type="error" class="mt-4 mb-0 stream-save-error">
          {{ saveError }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text class="stream-cancel-btn" @click="cancel">{{ $t('page.kiosk.cameras.cancel') }}</v-btn>
        <v-btn text color="primary" :loading="saving" class="stream-save-btn" @click="submit">
          {{ $t('page.kiosk.cameras.save') }}
        </v-btn>
      </v-card-actions>

      <ConfirmDialog
        ref="confirmDialog"
        :confirmText="$t('page.kiosk.cameras.confirm')"
        :cancelText="$t('page.kiosk.cameras.cancel')"
      ></ConfirmDialog>
    </v-card>
  </v-dialog>
</template>

<script lang="js">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { cameraDisplay } from '@/mixins/cameraDisplay'
import { singleton as camerasService } from '@/utils/webservices/camerasService'

// Frigate's own guidance, and the two numbers most often got wrong: anything
// above these loads the node for nothing, because detection downscales anyway.
const DETECT_MAX_WIDTH = 1280
const DETECT_MAX_FPS = 10

const PARAMETER_FIELDS = [
  { key: 'width', numeric: true },
  { key: 'height', numeric: true },
  { key: 'fps', numeric: true },
  { key: 'bitrateKbps', numeric: true },
  { key: 'videoCodec', numeric: false },
  { key: 'audioCodec', numeric: false }
]

export default {
  name: 'cameraStreamSettings',

  components: { ConfirmDialog },

  mixins: [cameraDisplay],

  props: {
    value: { type: Boolean, default: false },
    camera: { type: Object, default: null },
    /**
     * The camera's node, for the default retention it applies to a camera that
     * states none. Passed in rather than fetched here: the page has the node
     * list already, and a dialog that opens per camera must not add a request.
     */
    node: { type: Object, default: null }
  },

  data: () => ({
    // A working copy: nothing is sent until save, so cancelling has to leave
    // the camera in the list untouched - including its nested streams.
    draft: null,
    // what the retention was when the dialog opened, so a *lowering* can be
    // told apart from any other edit
    originalRetention: null,
    probing: {},
    probeErrors: {},
    newStreamName: '',
    newStreamUrl: '',
    streamError: null,
    saving: false,
    saveError: null,
    roleOrder: ['live', 'detect', 'record'],
    parameterFields: PARAMETER_FIELDS
  }),

  computed: {
    streamNames () {
      return this.draft ? this.draft.streams.map(stream => stream.name) : []
    },

    assignedDetectStream () {
      return this.streamOf('detect')
    },

    assignedRecordStream () {
      return this.streamOf('record')
    },

    /**
     * The lower-resolution stream to point at when detection sits on a big one:
     * the narrowest stream that is actually narrower than the assigned one.
     */
    lowerResolutionStream () {
      const detect = this.assignedDetectStream
      if (!this.draft || !detect || detect.width === null) {
        return null
      }
      return this.draft.streams
        .filter(stream => stream.width !== null && stream.width < detect.width)
        .sort((a, b) => a.width - b.width)[0] || null
    },

    detectAdvisory () {
      const stream = this.assignedDetectStream
      if (!stream) {
        return null
      }
      const tooWide = stream.width !== null && stream.width > DETECT_MAX_WIDTH
      const tooFast = stream.fps !== null && stream.fps > DETECT_MAX_FPS
      if (!tooWide && !tooFast) {
        return null
      }
      const text = this.$t('page.kiosk.cameras.streams.detectAdvisory', {
        name: stream.name,
        width: stream.width === null ? '?' : stream.width,
        fps: stream.fps === null ? '?' : stream.fps,
        maxWidth: DETECT_MAX_WIDTH,
        maxFps: DETECT_MAX_FPS
      })
      const lower = this.lowerResolutionStream
      return lower
        ? `${text} ${this.$t('page.kiosk.cameras.streams.detectAdvisoryUse', { name: lower.name })}`
        : text
    },

    detectResolutionAdvisory () {
      const stream = this.assignedDetectStream
      if (!this.draft || !stream || stream.width === null || stream.height === null) {
        return null
      }
      const width = Number(this.draft.detect.width)
      const height = Number(this.draft.detect.height)
      if (!(width > stream.width || height > stream.height)) {
        return null
      }
      return this.$t('page.kiosk.cameras.streams.detectAboveStream', {
        name: stream.name,
        width: stream.width,
        height: stream.height
      })
    },

    audioAdvisory () {
      const stream = this.assignedDetectStream
      if (!this.draft || !this.draft.detect.audioEnabled || !stream) {
        return null
      }
      // only a *probed* stream can say there is no audio track; an unprobed one
      // simply does not know, and guessing would be the wrong kind of warning
      if (!stream.probedAt || stream.audioCodec) {
        return null
      }
      return this.$t('page.kiosk.cameras.streams.audioWithoutTrack', { name: stream.name })
    },

    /**
     * What applies while the camera states no retention of its own: the node's
     * default, named in days, or nothing known at all. Null once the camera has
     * a retention - the field then says it itself.
     */
    retentionHint () {
      const stated = this.draft && this.draft.recording.retentionDays
      if (stated !== null && stated !== undefined && stated !== '') {
        return null
      }
      const fallback = this.node && this.node.defaultRetentionDays
      return fallback === null || fallback === undefined
        ? this.$t('page.kiosk.cameras.streams.retentionUnknownDefault')
        : this.$t('page.kiosk.cameras.streams.retentionNodeDefault', { days: fallback })
    },

    /**
     * Rounded GB/day for continuous recording, from the record stream's
     * reported bitrate. Null where the camera reports none - which is every
     * camera here - so the page says the figure cannot be given rather than
     * guessing one.
     */
    storageEstimate () {
      const stream = this.assignedRecordStream
      if (!stream || stream.bitrateKbps === null) {
        return null
      }
      const gigabytesPerDay = (stream.bitrateKbps / 8 / 1024 / 1024) * 86400
      return Math.round(gigabytesPerDay * 10) / 10
    },

    // v-slider cannot hold a null, but "never reported" is exactly what null
    // means here - so it is shown at the neutral middle until the user moves it
    motionThresholdValue: {
      get () {
        const stored = this.draft && this.draft.detect.motionThreshold
        return stored === null || stored === undefined ? 50 : stored
      },
      set (value) {
        this.draft.detect.motionThreshold = value
      }
    }
  },

  watch: {
    value (open) {
      if (open) {
        this.reset()
      }
    }
  },

  methods: {
    capitalized (value) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    },

    reset () {
      const camera = this.camera || {}
      this.draft = {
        streams: (camera.streams || []).map(stream => Object.assign({}, stream, {
          settableFields: (stream.settableFields || []).slice()
        })),
        roles: Object.assign({}, camera.roles),
        recording: Object.assign({}, camera.recording),
        detect: Object.assign({}, camera.detect)
      }
      this.originalRetention = this.draft.recording.retentionDays
      this.probing = {}
      this.probeErrors = {}
      this.newStreamName = ''
      this.newStreamUrl = ''
      this.streamError = null
      this.saveError = null
    },

    streamOf (role) {
      if (!this.draft) {
        return null
      }
      return this.draft.streams.find(stream => stream.name === this.draft.roles[role]) || null
    },

    rolesOf (name) {
      if (!this.draft) {
        return []
      }
      return this.roleOrder.filter(role => this.draft.roles[role] === name)
    },

    isSettable (stream, field) {
      return (stream.settableFields || []).indexOf(field) >= 0
    },

    isAnySettable (stream) {
      return (stream.settableFields || []).length > 0
    },

    parameterText (stream, field) {
      const value = stream[field]
      return value === null || value === undefined || value === ''
        ? this.$t('page.kiosk.cameras.streams.unknownValue')
        : value
    },

    addStream () {
      this.streamError = null
      const name = (this.newStreamName || '').trim()
      const url = (this.newStreamUrl || '').trim()
      if (!name || !url) {
        this.streamError = this.$t('page.kiosk.cameras.streams.addStreamIncomplete')
        return
      }
      // the server refuses anything outside [a-z0-9_]; naming the allowed
      // characters here saves a round trip that says the same thing
      this.streamError = this.streamNameProblem(name)
      if (this.streamError) {
        return
      }
      if (this.streamNames.indexOf(name) >= 0) {
        this.streamError = this.$t('page.kiosk.cameras.streams.addStreamDuplicate', { name })
        return
      }
      this.draft.streams.push({
        name,
        url,
        width: null,
        height: null,
        fps: null,
        bitrateKbps: null,
        videoCodec: null,
        audioCodec: null,
        probedAt: null,
        settableFields: []
      })
      this.newStreamName = ''
      this.newStreamUrl = ''
    },

    /**
     * Both refusals name what stands in the way rather than only saying no: the
     * roles that still point at the stream are what the user has to move first.
     */
    removeStream (stream) {
      this.streamError = null
      if (stream.name === 'main') {
        this.streamError = this.$t('page.kiosk.cameras.streams.removeMainRefused')
        return
      }
      const used = this.rolesOf(stream.name)
      if (used.length) {
        this.streamError = this.$t('page.kiosk.cameras.streams.removeInUseRefused', {
          name: stream.name,
          roles: used.map(role => this.$t('page.kiosk.cameras.streams.role' + this.capitalized(role))).join(', ')
        })
        return
      }
      this.draft.streams = this.draft.streams.filter(candidate => candidate.name !== stream.name)
    },

    async probe (stream) {
      this.$set(this.probing, stream.name, true)
      this.$set(this.probeErrors, stream.name, null)
      try {
        const result = await camerasService.probeStream(this.camera.nodeId, stream.url, this.camera.username)
        if (result.result === 'ok' && result.measured) {
          Object.assign(stream, result.measured, { probedAt: this.measuredAt(result.measured) })
        } else {
          // the previously known values stay exactly as they were - a failed
          // measurement is not a reason to forget the last successful one
          this.$set(this.probeErrors, stream.name, result.reason || this.$t('page.kiosk.cameras.streams.probeFailedUnknown'))
        }
      } catch (err) {
        this.$set(this.probeErrors, stream.name, (err && err.serverMessage) || this.$t('page.kiosk.cameras.streams.probeFailedUnknown'))
      }
      this.$set(this.probing, stream.name, false)
    },

    cancel () {
      this.$emit('input', false)
    },

    /**
     * Shortening the retention throws footage away on the node, which is the
     * one edit in this dialog that destroys something - so it is the one that
     * asks first.
     */
    submit () {
      // what the server would refuse anyway, at the field and before anything
      // is sent: a correctable mistake must not cost a round trip
      this.saveError = this.retentionProblem(this.draft.recording) ||
        this.streamUrlProblem(this.draft.streams)
      if (this.saveError) {
        return
      }
      const lowered = this.originalRetention !== null && this.originalRetention !== undefined &&
        Number(this.draft.recording.retentionDays) < Number(this.originalRetention)
      if (this.draft.recording.enabled && lowered) {
        this.$refs.confirmDialog.open(
          this.$t('page.kiosk.cameras.streams.retentionLowerConfirm', {
            oldDays: this.originalRetention,
            newDays: this.draft.recording.retentionDays
          }),
          () => this.save()
        )
        return
      }
      this.save()
    },

    payload () {
      const camera = this.camera
      const streams = this.draft.streams.map(stream => Object.assign({}, stream, {
        width: this.asNumber(stream.width),
        height: this.asNumber(stream.height),
        fps: this.asNumber(stream.fps),
        bitrateKbps: this.asNumber(stream.bitrateKbps)
      }))
      return {
        nodeId: camera.nodeId,
        displayName: camera.displayName,
        frigateKey: camera.frigateKey,
        sourceUrl: camera.sourceUrl,
        username: camera.username,
        usedOnLivePage: camera.usedOnLivePage,
        usedOnEventsPage: camera.usedOnEventsPage,
        sortOrder: camera.sortOrder,
        enabled: camera.enabled,
        streams,
        roles: Object.assign({}, this.draft.roles),
        recording: {
          enabled: this.draft.recording.enabled,
          mode: this.draft.recording.mode,
          retentionDays: this.asNumber(this.draft.recording.retentionDays)
        },
        detect: {
          width: this.asNumber(this.draft.detect.width),
          height: this.asNumber(this.draft.detect.height),
          fps: this.asNumber(this.draft.detect.fps),
          audioEnabled: this.draft.detect.audioEnabled,
          motionThreshold: this.asNumber(this.draft.detect.motionThreshold)
        }
      }
    },

    // a v-text-field hands back a string even with .number when the field was
    // typed into and cleared, and '' must not become 0
    asNumber (value) {
      if (value === null || value === undefined || value === '') {
        return null
      }
      const number = Number(value)
      return isNaN(number) ? null : number
    },

    async save () {
      this.saving = true
      this.saveError = null
      try {
        const saved = await camerasService.updateCamera(this.camera.id, this.payload())
        this.$emit('saved', saved)
        this.$emit('input', false)
      } catch (err) {
        // stays open with everything the user entered: a refused parameter has
        // to be correctable, not retyped
        this.saveError = (err && err.serverMessage) || this.$t('page.kiosk.cameras.saveError')
      }
      this.saving = false
    }
  }
}
</script>

<style lang="scss">
/* The dialog carries several stacked blocks whose labels wrap; Vuetify's
   defaults truncate single-line text, which hides the advisories that carry
   the actual meaning here. */
.stream-settings .stream-param-field {
  min-width: 120px;
}

.stream-settings .role-assignment {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stream-settings .role-select {
  max-width: 200px;
}
</style>
