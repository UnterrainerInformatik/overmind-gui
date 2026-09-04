<template>
  <v-dialog
    :value="value"
    max-width="760"
    :fullscreen="$vuetify.breakpoint.xsOnly"
    scrollable
    persistent
    @input="$emit('input', $event)"
  >
    <v-card class="camera-assistant">
      <v-card-title>{{ $t('page.kiosk.cameras.assistant.title') }}</v-card-title>
      <v-card-text class="pa-0">
        <!-- Vuetify's stepper header is a single non-wrapping row, which
             overflows a phone; `vertical` is the mode that fits there, so the
             header is dropped and the steps are interleaved with their content
             instead. `v-stepper-items` is deliberately absent: a content
             registers with the stepper itself, and the wrapper is what would
             force the two layouts to be written out twice. -->
        <v-stepper v-model="step" :vertical="isPhone" flat class="camera-assistant-stepper">
          <v-stepper-header v-if="!isPhone">
            <template v-for="definition in stepDefinitions">
              <v-stepper-step
                :key="'h' + definition.number"
                :step="definition.number"
                :complete="step > definition.number"
                :editable="step > definition.number"
              >{{ $t(definition.label) }}</v-stepper-step>
              <v-divider v-if="definition.number < 4" :key="'d' + definition.number"></v-divider>
            </template>
          </v-stepper-header>

          <!-- ---------------- 1: the node ---------------- -->
          <v-stepper-step
            v-if="isPhone"
            :step="1"
            :complete="step > 1"
            :editable="step > 1"
          >{{ $t('page.kiosk.cameras.assistant.stepNode') }}</v-stepper-step>
          <v-stepper-content :step="1">
            <div class="assistant-step assistant-step-node">
              <template v-if="nodes.length">
                <v-select
                  v-model="draft.nodeId"
                  :items="nodeItems"
                  :label="$t('page.kiosk.cameras.fieldNode')"
                  dense
                  outlined
                  hide-details="auto"
                  class="mb-2 assistant-node-select"
                ></v-select>
                <div v-if="selectedNode" class="assistant-node-status" :class="statusClass(selectedNode)">
                  {{ statusText(selectedNode) }}
                </div>
                <v-alert v-if="selectedNodeUnreachable" dense outlined type="warning" class="mt-2 mb-0 assistant-node-warning">
                  {{ $t('page.kiosk.cameras.assistant.nodeUnreachable', { name: selectedNode.name }) }}
                  <v-btn small text :loading="testingNode" class="assistant-node-test-btn" @click="testNode">
                    {{ $t('page.kiosk.cameras.test') }}
                  </v-btn>
                </v-alert>
                <div v-if="nodeTestResult" class="mt-2 assistant-node-test-result" :class="nodeTestResult.result === 'ok' ? 'success--text' : 'error--text'">
                  {{ testText(nodeTestResult) }}
                </div>
                <v-btn small text color="primary" class="mt-3 assistant-new-node-btn" @click="nodeFormOpen = true">
                  {{ $t('page.kiosk.cameras.addNode') }}
                </v-btn>
              </template>
              <v-alert v-else dense outlined type="info" class="mb-2 assistant-no-nodes">
                {{ $t('page.kiosk.cameras.assistant.noNodes') }}
              </v-alert>

              <!-- Creating a node here is the one thing the assistant writes
                   before the final confirm: a node is a resource of its own and
                   the page's node list has to show it right away. -->
              <div v-if="nodeFormOpen || !nodes.length" class="mt-2 assistant-node-form">
                <v-text-field
                  v-model="nodeForm.name"
                  :label="$t('page.kiosk.cameras.fieldNodeName')"
                  dense
                  outlined
                  hide-details="auto"
                  class="mb-2"
                ></v-text-field>
                <v-text-field
                  v-model="nodeForm.frigateBaseUrl"
                  :label="$t('page.kiosk.cameras.fieldFrigateBaseUrl')"
                  dense
                  outlined
                  hide-details="auto"
                  class="mb-2"
                ></v-text-field>
                <v-text-field
                  v-model="nodeForm.streamBaseUrl"
                  :label="$t('page.kiosk.cameras.fieldStreamBaseUrl')"
                  dense
                  outlined
                  hide-details="auto"
                  class="mb-2"
                ></v-text-field>
                <div class="text--disabled mb-2 assistant-node-kept-note">
                  {{ $t('page.kiosk.cameras.assistant.nodeKeptOnCancel') }}
                </div>
                <v-btn
                  small
                  color="primary"
                  :loading="nodeSaving"
                  :disabled="!nodeFormValid"
                  class="assistant-create-node-btn"
                  @click="createNode"
                >{{ $t('page.kiosk.cameras.assistant.createNode') }}</v-btn>
                <v-alert v-if="nodeFormError" dense outlined type="error" class="mt-2 mb-0">
                  {{ nodeFormError }}
                </v-alert>
              </div>

              <v-alert v-if="stepErrors[1]" dense outlined type="error" class="mt-3 mb-0 assistant-step-error">
                {{ stepErrors[1] }}
              </v-alert>
            </div>
          </v-stepper-content>

          <!-- ---------------- 2: the connection ---------------- -->
          <v-stepper-step
            v-if="isPhone"
            :step="2"
            :complete="step > 2"
            :editable="step > 2"
          >{{ $t('page.kiosk.cameras.assistant.stepConnection') }}</v-stepper-step>
          <v-stepper-content :step="2">
            <div class="assistant-step assistant-step-connection">
              <v-text-field
                v-model="draft.address"
                :label="$t('page.kiosk.cameras.fieldSourceUrl')"
                dense
                outlined
                hide-details="auto"
                class="mb-2 assistant-address"
              ></v-text-field>
              <v-text-field
                v-model="draft.username"
                :label="$t('page.kiosk.cameras.fieldUsername')"
                dense
                outlined
                hide-details="auto"
                class="mb-2 assistant-username"
              ></v-text-field>
              <v-text-field
                v-model="draft.password"
                type="password"
                autocomplete="new-password"
                :label="$t('page.kiosk.cameras.fieldPassword')"
                :hint="$t('page.kiosk.cameras.assistant.passwordHint')"
                persistent-hint
                dense
                outlined
                class="mb-2 assistant-password"
              ></v-text-field>

              <v-btn
                small
                text
                color="primary"
                :loading="testingConnection"
                :disabled="!draft.address"
                class="assistant-test-btn"
                @click="testConnection"
              >{{ $t('page.kiosk.cameras.assistant.testConnection') }}</v-btn>

              <div v-if="connectionTest" class="mt-2 assistant-test-result" :class="connectionTest.result === 'ok' ? 'success--text' : 'error--text'">
                <span v-if="connectionTest.result === 'ok'">{{ $t('page.kiosk.cameras.assistant.testOk') }}</span>
                <span v-else>{{ testText(connectionTest) }}</span>
              </div>

              <!-- The camera may be stored without a successful test: it is
                   allowed to be entered while it is off, and the page says so
                   rather than blocking. -->
              <v-alert
                v-if="!connectionTest || connectionTest.result !== 'ok'"
                dense
                outlined
                type="info"
                class="mt-3 mb-0 assistant-unverified-note"
              >{{ $t('page.kiosk.cameras.assistant.unverifiedNote') }}</v-alert>

              <v-alert v-if="stepErrors[2]" dense outlined type="error" class="mt-3 mb-0 assistant-step-error">
                {{ stepErrors[2] }}
              </v-alert>
            </div>
          </v-stepper-content>

          <!-- ---------------- 3: the streams ---------------- -->
          <v-stepper-step
            v-if="isPhone"
            :step="3"
            :complete="step > 3"
            :editable="step > 3"
          >{{ $t('page.kiosk.cameras.assistant.stepStreams') }}</v-stepper-step>
          <v-stepper-content :step="3">
            <div class="assistant-step assistant-step-streams">
              <v-card
                v-for="stream in draft.streams"
                :key="stream.name"
                outlined
                class="pa-3 mb-2 assistant-stream"
                :data-stream="stream.name"
              >
                <div class="d-flex align-center flex-wrap">
                  <span class="text-subtitle-2 mr-2">{{ stream.name }}</span>
                  <v-spacer></v-spacer>
                  <v-btn small text :loading="!!probing[stream.name]" class="assistant-probe-btn" @click="probe(stream)">
                    {{ $t('page.kiosk.cameras.streams.probe') }}
                  </v-btn>
                </div>
                <v-text-field
                  v-model="stream.url"
                  :label="$t('page.kiosk.cameras.streams.streamUrl')"
                  dense
                  outlined
                  hide-details="auto"
                  class="mb-1"
                  @input="onStreamUrlInput(stream)"
                ></v-text-field>
                <div v-if="!stream.probedAt" class="text--disabled assistant-stream-unprobed">
                  {{ $t('page.kiosk.cameras.streams.notProbed') }}
                </div>
                <div v-else class="assistant-stream-probed">
                  {{ parameterSummary(stream) }}
                </div>
                <div v-if="probeErrors[stream.name]" class="error--text assistant-stream-probe-error">
                  {{ $t('page.kiosk.cameras.streams.probeFailed', { reason: probeErrors[stream.name] }) }}
                </div>
              </v-card>

              <div class="d-flex align-center flex-wrap mb-2">
                <v-text-field
                  v-model="newStreamName"
                  :label="$t('page.kiosk.cameras.streams.streamName')"
                  dense
                  outlined
                  hide-details="auto"
                  class="mr-2 assistant-new-stream-name"
                  style="max-width: 160px"
                ></v-text-field>
                <v-text-field
                  v-model="newStreamUrl"
                  :label="$t('page.kiosk.cameras.streams.streamUrl')"
                  dense
                  outlined
                  hide-details="auto"
                  class="mr-2 assistant-new-stream-url"
                ></v-text-field>
                <v-btn small text color="primary" class="assistant-add-stream-btn" @click="addStream">
                  {{ $t('page.kiosk.cameras.streams.addStream') }}
                </v-btn>
              </div>

              <div class="text-subtitle-2 mt-3">{{ $t('page.kiosk.cameras.streams.rolesTitle') }}</div>
              <div v-if="assignmentProposal" class="text--disabled mb-2 assistant-proposal">
                {{ assignmentProposal }}
              </div>
              <div class="d-flex flex-wrap assistant-roles">
                <v-select
                  v-for="role in roleOrder"
                  :key="role"
                  v-model="draft.roles[role]"
                  :items="streamNames"
                  :label="$t('page.kiosk.cameras.streams.role' + capitalized(role))"
                  :class="'mr-2 mb-2 assistant-role-select assistant-role-' + role"
                  dense
                  outlined
                  hide-details="auto"
                  style="max-width: 200px"
                ></v-select>
              </div>

              <v-alert v-if="stepErrors[3]" dense outlined type="error" class="mt-3 mb-0 assistant-step-error">
                {{ stepErrors[3] }}
              </v-alert>
            </div>
          </v-stepper-content>

          <!-- ---------------- 4: naming and the summary ---------------- -->
          <v-stepper-step
            v-if="isPhone"
            :step="4"
            :complete="false"
            :editable="step > 4"
          >{{ $t('page.kiosk.cameras.assistant.stepNaming') }}</v-stepper-step>
          <v-stepper-content :step="4">
            <div class="assistant-step assistant-step-naming">
              <v-text-field
                v-model="draft.displayName"
                :label="$t('page.kiosk.cameras.fieldDisplayName')"
                dense
                outlined
                hide-details="auto"
                class="mb-2 assistant-display-name"
              ></v-text-field>
              <v-text-field
                v-model="draft.frigateKey"
                :label="$t('page.kiosk.cameras.fieldFrigateKey')"
                :hint="$t('page.kiosk.cameras.fieldFrigateKeyHint')"
                persistent-hint
                dense
                outlined
                class="mb-2 assistant-frigate-key"
              ></v-text-field>
              <v-text-field
                v-model.number="draft.sortOrder"
                type="number"
                :label="$t('page.kiosk.cameras.fieldSortOrder')"
                dense
                outlined
                hide-details="auto"
                class="mb-2 assistant-sort-order"
                style="max-width: 200px"
              ></v-text-field>
              <v-switch
                v-model="draft.usedOnLivePage"
                :label="$t('page.kiosk.cameras.fieldUsedOnLivePage')"
                dense
                hide-details="auto"
                class="mt-2"
              ></v-switch>
              <v-switch
                v-model="draft.usedOnEventsPage"
                :label="$t('page.kiosk.cameras.fieldUsedOnEventsPage')"
                dense
                hide-details="auto"
                class="mt-2"
              ></v-switch>

              <v-card outlined class="pa-3 mt-4 assistant-summary">
                <div class="text-subtitle-2 mb-1">{{ $t('page.kiosk.cameras.assistant.summaryTitle') }}</div>
                <div class="assistant-summary-node">{{ $t('page.kiosk.cameras.assistant.summaryNode', { name: selectedNode ? selectedNode.name : '-' }) }}</div>
                <div class="assistant-summary-test">{{ summaryTestText }}</div>
                <div class="assistant-summary-roles">{{ summaryRolesText }}</div>
              </v-card>

              <v-alert v-if="stepErrors[4]" dense outlined type="error" class="mt-3 mb-0 assistant-step-error">
                {{ stepErrors[4] }}
              </v-alert>
            </div>
          </v-stepper-content>
        </v-stepper>
      </v-card-text>

      <v-card-actions>
        <v-btn text class="assistant-cancel-btn" @click="cancel">{{ $t('page.kiosk.cameras.cancel') }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn v-if="step > 1" text class="assistant-back-btn" @click="step = step - 1">
          {{ $t('page.kiosk.cameras.assistant.back') }}
        </v-btn>
        <v-btn
          v-if="step < 4"
          text
          color="primary"
          :disabled="!stepValid"
          class="assistant-next-btn"
          @click="next"
        >{{ $t('page.kiosk.cameras.assistant.next') }}</v-btn>
        <v-btn
          v-else
          text
          color="primary"
          :loading="creating"
          :disabled="!stepValid"
          class="assistant-confirm-btn"
          @click="confirm"
        >{{ $t('page.kiosk.cameras.assistant.confirm') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="js">
import { cameraDisplay } from '@/mixins/cameraDisplay'
import { singleton as camerasService } from '@/utils/webservices/camerasService'

const emptyStream = (name, url) => ({
  name,
  url: url || '',
  width: null,
  height: null,
  fps: null,
  bitrateKbps: null,
  videoCodec: null,
  audioCodec: null,
  probedAt: null,
  settableFields: []
})

const emptyDraft = () => ({
  nodeId: null,
  address: '',
  username: '',
  password: '',
  streams: [emptyStream('main', '')],
  roles: { live: 'main', detect: 'main', record: 'main' },
  displayName: '',
  frigateKey: '',
  sortOrder: 0,
  usedOnLivePage: false,
  usedOnEventsPage: false,
  enabled: true
})

export default {
  name: 'cameraSetupAssistant',

  mixins: [cameraDisplay],

  props: {
    value: { type: Boolean, default: false },
    nodes: { type: Array, default: () => [] },
    cameras: { type: Array, default: () => [] },
    // set when the assistant is opened for one node - from the node detail
    // dialog - so the node step is answered and the connection is what is left
    presetNodeId: { type: Number, default: null }
  },

  data: () => ({
    step: 1,
    // The whole camera lives here until the final confirm; nothing but a
    // deliberately created node reaches the server before that.
    draft: emptyDraft(),
    stepDefinitions: [
      { number: 1, label: 'page.kiosk.cameras.assistant.stepNode' },
      { number: 2, label: 'page.kiosk.cameras.assistant.stepConnection' },
      { number: 3, label: 'page.kiosk.cameras.assistant.stepStreams' },
      { number: 4, label: 'page.kiosk.cameras.assistant.stepNaming' }
    ],
    roleOrder: ['live', 'detect', 'record'],

    nodeFormOpen: false,
    nodeForm: { name: '', frigateBaseUrl: '', streamBaseUrl: '' },
    nodeSaving: false,
    nodeFormError: null,
    testingNode: false,
    nodeTestResult: null,

    testingConnection: false,
    connectionTest: null,

    probing: {},
    probeErrors: {},
    newStreamName: '',
    newStreamUrl: '',

    creating: false,
    // the reason the server gave, held against the step that owns the value it
    // objected to - so a rejected Frigate key is read where it was typed
    stepErrors: {}
  }),

  computed: {
    isPhone () {
      return this.$vuetify.breakpoint.xsOnly
    },

    nodeItems () {
      return this.nodes.map(node => ({ value: node.id, text: node.name }))
    },

    selectedNode () {
      return this.nodes.find(node => node.id === this.draft.nodeId) || null
    },

    selectedNodeUnreachable () {
      return !!(this.selectedNode && this.selectedNode.lastStatus === 'error')
    },

    nodeFormValid () {
      return !!(this.nodeForm.name && /^https?:\/\/.+/.test((this.nodeForm.frigateBaseUrl || '').trim()))
    },

    streamNames () {
      return this.draft.streams.map(stream => stream.name)
    },

    mainStream () {
      return this.draft.streams[0] || null
    },

    /** The proposal from the spec, stated so the user sees it is a proposal. */
    assignmentProposal () {
      if (this.draft.streams.length < 2) {
        return this.$t('page.kiosk.cameras.assistant.proposalSingle')
      }
      return this.$t('page.kiosk.cameras.assistant.proposalTwo', {
        main: this.draft.streams[0].name,
        second: this.draft.streams[1].name
      })
    },

    summaryTestText () {
      if (!this.connectionTest) {
        return this.$t('page.kiosk.cameras.assistant.summaryTestNone')
      }
      return this.connectionTest.result === 'ok'
        ? this.$t('page.kiosk.cameras.assistant.summaryTestOk')
        : this.$t('page.kiosk.cameras.assistant.summaryTestFailed', { reason: this.connectionTest.reason || '' })
    },

    summaryRolesText () {
      return this.$t('page.kiosk.cameras.assistant.summaryRoles', {
        live: this.draft.roles.live,
        detect: this.draft.roles.detect,
        record: this.draft.roles.record
      })
    },

    stepValid () {
      if (this.step === 1) {
        return this.draft.nodeId !== null && this.draft.nodeId !== undefined
      }
      if (this.step === 2) {
        return !!(this.draft.address || '').trim()
      }
      if (this.step === 4) {
        return !!(this.draft.displayName && this.draft.frigateKey)
      }
      return true
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
      this.draft = emptyDraft()
      // a new camera goes to the end of the configured order
      this.draft.sortOrder = this.cameras.length
        ? Math.max.apply(null, this.cameras.map(camera => camera.sortOrder)) + 1
        : 0
      if (this.presetNodeId !== null && this.presetNodeId !== undefined) {
        this.draft.nodeId = this.presetNodeId
        this.step = 2
      } else {
        this.draft.nodeId = this.nodes.length === 1 ? this.nodes[0].id : null
        this.step = 1
      }
      this.nodeFormOpen = false
      this.nodeForm = { name: '', frigateBaseUrl: '', streamBaseUrl: '' }
      this.nodeFormError = null
      this.nodeTestResult = null
      this.connectionTest = null
      this.probing = {}
      this.probeErrors = {}
      this.newStreamName = ''
      this.newStreamUrl = ''
      this.stepErrors = {}
    },

    parameterSummary (stream) {
      const parts = []
      if (stream.width !== null && stream.height !== null) {
        parts.push(`${stream.width}x${stream.height}`)
      }
      if (stream.fps !== null) {
        parts.push(`${stream.fps} fps`)
      }
      if (stream.bitrateKbps !== null) {
        parts.push(`${stream.bitrateKbps} kbit/s`)
      }
      if (stream.videoCodec) {
        parts.push(stream.videoCodec)
      }
      parts.push(stream.audioCodec || this.$t('page.kiosk.cameras.streams.noAudio'))
      return parts.join(' · ')
    },

    async createNode () {
      this.nodeSaving = true
      this.nodeFormError = null
      try {
        const created = await camerasService.createNode({
          name: this.nodeForm.name,
          frigateBaseUrl: this.nodeForm.frigateBaseUrl.trim(),
          streamBaseUrl: this.nodeForm.streamBaseUrl ? this.nodeForm.streamBaseUrl.trim() : null,
          enabled: true
        })
        // the page owns the node list, so it reloads and the new node is in
        // `nodes` by the time the select below is rendered again
        this.$emit('nodes-changed', created)
        if (created) {
          this.draft.nodeId = created.id
        }
        this.nodeFormOpen = false
        this.nodeForm = { name: '', frigateBaseUrl: '', streamBaseUrl: '' }
      } catch (err) {
        this.nodeFormError = (err && err.serverMessage) || this.$t('page.kiosk.cameras.saveError')
      }
      this.nodeSaving = false
    },

    async testNode () {
      this.testingNode = true
      this.nodeTestResult = null
      try {
        this.nodeTestResult = await camerasService.testNode(this.draft.nodeId)
      } catch (err) {
        this.nodeTestResult = { result: 'error', reason: (err && err.serverMessage) || null }
      }
      this.testingNode = false
      this.$emit('nodes-changed', null)
    },

    /**
     * The camera does not exist yet, so the only thing that can answer "can
     * this node reach this address" is the node's own probe - which is also
     * what fills the main stream's parameters, so a successful test leaves
     * step 3 with something already measured.
     */
    async testConnection () {
      this.testingConnection = true
      this.connectionTest = null
      const stream = this.mainStream
      stream.url = (this.draft.address || '').trim()
      try {
        const result = await camerasService.probeStream(
          this.draft.nodeId, stream.url, this.draft.username, this.draft.password)
        this.connectionTest = { result: result.result, reason: result.reason }
        if (result.result === 'ok' && result.measured) {
          Object.assign(stream, result.measured, { probedAt: new Date().toISOString().replace('Z', '') })
        }
      } catch (err) {
        this.connectionTest = { result: 'error', reason: (err && err.serverMessage) || null }
      }
      this.testingConnection = false
    },

    onStreamUrlInput (stream) {
      if (stream === this.mainStream) {
        this.draft.address = stream.url
      }
    },

    addStream () {
      const name = (this.newStreamName || '').trim()
      const url = (this.newStreamUrl || '').trim()
      if (!name || !url || this.streamNames.indexOf(name) >= 0) {
        this.$set(this.stepErrors, 3, this.$t('page.kiosk.cameras.streams.addStreamIncomplete'))
        return
      }
      this.$set(this.stepErrors, 3, null)
      this.draft.streams.push(emptyStream(name, url))
      this.newStreamName = ''
      this.newStreamUrl = ''
      this.proposeAssignment()
    },

    /**
     * Recording and live on the main stream, detection on the second one where
     * there is one - the spec's proposal, applied whenever the set of streams
     * changes and always changeable afterwards.
     */
    proposeAssignment () {
      const main = this.draft.streams[0]
      const second = this.draft.streams[1]
      this.draft.roles = {
        record: main.name,
        live: main.name,
        detect: second ? second.name : main.name
      }
    },

    async probe (stream) {
      this.$set(this.probing, stream.name, true)
      this.$set(this.probeErrors, stream.name, null)
      try {
        const result = await camerasService.probeStream(
          this.draft.nodeId, stream.url, this.draft.username, this.draft.password)
        if (result.result === 'ok' && result.measured) {
          Object.assign(stream, result.measured, { probedAt: new Date().toISOString().replace('Z', '') })
        } else {
          this.$set(this.probeErrors, stream.name, result.reason || this.$t('page.kiosk.cameras.streams.probeFailedUnknown'))
        }
      } catch (err) {
        this.$set(this.probeErrors, stream.name, (err && err.serverMessage) || this.$t('page.kiosk.cameras.streams.probeFailedUnknown'))
      }
      this.$set(this.probing, stream.name, false)
    },

    next () {
      if (this.step === 2) {
        this.mainStream.url = (this.draft.address || '').trim()
      }
      this.step = this.step + 1
    },

    cancel () {
      this.$emit('input', false)
    },

    /**
     * Which step owns a refused value, so the reason is read where the value
     * was typed rather than at the end. The match is on the server's own field
     * names, which is what its messages quote.
     */
    stepForReason (reason) {
      const text = (reason || '').toLowerCase()
      if (text.indexOf('frigatekey') >= 0 || text.indexOf('frigate key') >= 0 || text.indexOf('displayname') >= 0) {
        return 4
      }
      if (text.indexOf('url') >= 0 || text.indexOf('stream') >= 0 || text.indexOf('password') >= 0 || text.indexOf('username') >= 0) {
        return 2
      }
      if (text.indexOf('node') >= 0) {
        return 1
      }
      return 4
    },

    async confirm () {
      this.creating = true
      this.stepErrors = {}
      try {
        const created = await camerasService.createCamera(this.payload())
        // A camera the server stores as not-yet-provisioned is created, not
        // failed: the assistant closes and the list shows the state.
        this.$emit('created', created)
        this.$emit('input', false)
      } catch (err) {
        const reason = (err && err.serverMessage) || this.$t('page.kiosk.cameras.saveError')
        const owner = this.stepForReason(err && err.serverMessage)
        this.$set(this.stepErrors, owner, reason)
        this.step = owner
      }
      this.creating = false
    },

    payload () {
      const draft = this.draft
      const url = role => {
        const stream = draft.streams.find(candidate => candidate.name === draft.roles[role])
        return (stream && stream.url) || null
      }
      const payload = {
        nodeId: draft.nodeId,
        displayName: draft.displayName,
        frigateKey: draft.frigateKey,
        sourceUrl: url('record') || draft.address,
        liveSourceUrl: url('live'),
        detectSourceUrl: url('detect'),
        username: draft.username || null,
        usedOnLivePage: draft.usedOnLivePage,
        usedOnEventsPage: draft.usedOnEventsPage,
        sortOrder: Number(draft.sortOrder) || 0,
        enabled: draft.enabled,
        streams: draft.streams.map(stream => Object.assign({}, stream)),
        roles: Object.assign({}, draft.roles),
        recording: { enabled: false, mode: 'events', retentionDays: null },
        detect: { width: null, height: null, fps: null, audioEnabled: false, motionThreshold: null }
      }
      if (draft.password) {
        payload.password = draft.password
      }
      return payload
    }
  }
}
</script>

<style lang="scss">
/* The stepper sits inside a scrollable card, so it must not add a second
   elevation or a background of its own. */
.camera-assistant .camera-assistant-stepper {
  box-shadow: none;
}

.camera-assistant .assistant-step {
  padding-top: 4px;
}
</style>
