<template>
  <div class="home">
    <v-container fluid class="ma-0 pa-0 d-flex flex-wrap align-start">
      <v-container fluid class="cameras-content">
        <div class="text-h5 mb-2">{{ $t('page.kiosk.cameras.title') }}</div>

        <v-btn color="primary" class="mb-4" @click="openAssistant(null)">
          {{ $t('page.kiosk.cameras.addCamera') }}
        </v-btn>

        <v-card v-if="camerasFetchError" outlined color="error" class="pa-4 mb-4">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.cameras.fetchError') }}
        </v-card>
        <v-card v-else-if="!camerasLoading && cameras.length === 0" outlined class="pa-4 mb-4">
          {{ $t('page.kiosk.cameras.empty') }}
        </v-card>

        <v-list v-else outlined class="mb-4">
          <v-list-item v-for="camera in cameras" :key="camera.id" class="cameras-row cameras-camera-row">
            <v-list-item-content>
              <v-list-item-title class="d-flex align-center flex-wrap">
                <span class="mr-2">{{ camera.displayName }}</span>
                <v-chip x-small outlined class="mr-1 mb-1">{{ camera.frigateKey }}</v-chip>
                <v-chip x-small outlined class="mr-1 mb-1">{{ nodeName(camera.nodeId) }}</v-chip>
                <v-chip
                  x-small
                  outlined
                  class="mr-1 mb-1"
                  :color="camera.enabled ? 'success' : 'warning'"
                >{{ camera.enabled ? $t('page.kiosk.cameras.enabledYes') : $t('page.kiosk.cameras.enabledNo') }}</v-chip>
                <v-chip v-if="camera.usedOnLivePage" x-small outlined color="primary" class="mr-1 mb-1">
                  {{ $t('page.kiosk.cameras.usageLive') }}
                </v-chip>
                <v-chip v-if="camera.usedOnEventsPage" x-small outlined color="primary" class="mr-1 mb-1">
                  {{ $t('page.kiosk.cameras.usageEvents') }}
                </v-chip>
                <v-chip
                  v-if="!camera.usedOnLivePage && !camera.usedOnEventsPage"
                  x-small
                  outlined
                  class="mr-1 mb-1"
                >{{ $t('page.kiosk.cameras.usageNone') }}</v-chip>
              </v-list-item-title>

              <v-list-item-subtitle class="cameras-line cameras-assignment">
                {{ assignmentText(camera) }}
              </v-list-item-subtitle>

              <v-list-item-subtitle class="cameras-line" :class="statusClass(camera)">
                {{ statusText(camera) }}
              </v-list-item-subtitle>

              <v-list-item-subtitle
                v-if="camera.provisioningState !== 'provisioned'"
                class="cameras-line"
                :class="provisioningClass(camera)"
              >
                {{ provisioningText(camera) }}
              </v-list-item-subtitle>

              <v-list-item-subtitle
                v-if="cameraTestResults[camera.id]"
                class="cameras-line"
                :class="testClass(cameraTestResults[camera.id])"
              >
                {{ testText(cameraTestResults[camera.id]) }}
              </v-list-item-subtitle>
            </v-list-item-content>

            <v-list-item-action class="cameras-actions">
              <v-btn
                icon
                :loading="testingCameraId === camera.id"
                :title="$t('page.kiosk.cameras.test')"
                @click.stop="testCamera(camera)"
              >
                <v-icon>network_check</v-icon>
              </v-btn>
              <v-btn
                icon
                class="cameras-streams-btn"
                :title="$t('page.kiosk.cameras.streamSettings')"
                @click.stop="openStreamSettings(camera)"
              >
                <v-icon>tune</v-icon>
              </v-btn>
              <v-btn icon :title="$t('page.kiosk.cameras.edit')" @click.stop="openEditCamera(camera)">
                <v-icon>edit</v-icon>
              </v-btn>
              <v-btn icon :title="$t('page.kiosk.cameras.delete')" @click.stop="requestDeleteCamera(camera)">
                <v-icon color="error">delete</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>

        <v-card v-if="cameraDeleteError" outlined color="error" class="pa-4 mb-4">
          {{ cameraDeleteError }}
        </v-card>

        <div class="text-h6 mb-2 mt-6">{{ $t('page.kiosk.cameras.nodesTitle') }}</div>

        <v-btn color="primary" class="mb-4" @click="openCreateNode">
          {{ $t('page.kiosk.cameras.addNode') }}
        </v-btn>

        <v-card v-if="nodesFetchError" outlined color="error" class="pa-4 mb-4">
          <v-icon left color="white">warning</v-icon>
          {{ $t('page.kiosk.cameras.nodesFetchError') }}
        </v-card>
        <v-card v-else-if="!nodesLoading && nodes.length === 0" outlined class="pa-4 mb-4">
          {{ $t('page.kiosk.cameras.nodesEmpty') }}
        </v-card>

        <v-list v-else outlined class="mb-4">
          <v-list-item
            v-for="node in nodes"
            :key="node.id"
            class="cameras-row cameras-node-row"
            @click="openNodeDetail(node)"
          >
            <v-list-item-content>
              <v-list-item-title class="d-flex align-center flex-wrap">
                <span class="mr-2">{{ node.name }}</span>
                <v-chip
                  x-small
                  outlined
                  class="mr-1 mb-1"
                  :color="node.enabled ? 'success' : 'warning'"
                >{{ node.enabled ? $t('page.kiosk.cameras.enabledYes') : $t('page.kiosk.cameras.enabledNo') }}</v-chip>
              </v-list-item-title>

              <v-list-item-subtitle class="cameras-line">{{ node.frigateBaseUrl }}</v-list-item-subtitle>

              <v-list-item-subtitle v-if="node.streamBaseUrl" class="cameras-line">
                {{ node.streamBaseUrl }}
              </v-list-item-subtitle>

              <v-list-item-subtitle class="cameras-line" :class="statusClass(node)">
                {{ statusText(node) }}
              </v-list-item-subtitle>

              <v-list-item-subtitle
                v-if="nodeTestResults[node.id]"
                class="cameras-line"
                :class="testClass(nodeTestResults[node.id])"
              >
                {{ testText(nodeTestResults[node.id]) }}
              </v-list-item-subtitle>
            </v-list-item-content>

            <v-list-item-action class="cameras-actions">
              <v-btn
                icon
                :loading="testingNodeId === node.id"
                :title="$t('page.kiosk.cameras.test')"
                @click.stop="testNode(node)"
              >
                <v-icon>network_check</v-icon>
              </v-btn>
              <v-btn icon :title="$t('page.kiosk.cameras.edit')" @click.stop="openEditNode(node)">
                <v-icon>edit</v-icon>
              </v-btn>
              <v-btn icon :title="$t('page.kiosk.cameras.delete')" @click.stop="requestDeleteNode(node)">
                <v-icon color="error">delete</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>

        <v-card v-if="nodeDeleteError" outlined color="error" class="pa-4 mb-4">
          {{ nodeDeleteError }}
        </v-card>
      </v-container>
    </v-container>

    <KioskLinkPanel
      class="cameras-back-btn"
      :text="$t('page.kiosk.linkBack')"
      route="/app/kioskoverview"
    ></KioskLinkPanel>

    <v-dialog v-model="cameraDialog" max-width="560" :fullscreen="$vuetify.breakpoint.xsOnly" scrollable>
      <v-card>
        <v-card-title>{{ $t('page.kiosk.cameras.editCameraTitle') }}</v-card-title>
        <v-card-text>
          <v-select
            v-model="cameraForm.nodeId"
            :items="nodeItems"
            :label="$t('page.kiosk.cameras.fieldNode')"
            :rules="[requiredRule]"
            :disabled="!hasNodes"
            validate-on-blur
            dense
            outlined
            hide-details="auto"
            class="mb-2"
          ></v-select>
          <v-text-field
            v-model="cameraForm.displayName"
            :label="$t('page.kiosk.cameras.fieldDisplayName')"
            :rules="[requiredRule]"
            validate-on-blur
            dense
            outlined
            hide-details="auto"
            class="mb-2"
          ></v-text-field>
          <v-text-field
            v-model="cameraForm.frigateKey"
            :label="$t('page.kiosk.cameras.fieldFrigateKey')"
            :hint="$t('page.kiosk.cameras.fieldFrigateKeyHint')"
            :rules="[requiredRule]"
            validate-on-blur
            persistent-hint
            dense
            outlined
            class="mb-2"
          ></v-text-field>
          <div class="text--disabled mb-2 cameras-streams-hint">
            {{ $t('page.kiosk.cameras.streamsMovedHint') }}
          </div>
          <v-text-field
            v-model="cameraForm.username"
            :label="$t('page.kiosk.cameras.fieldUsername')"
            dense
            outlined
            hide-details="auto"
            class="mb-2"
          ></v-text-field>
          <v-text-field
            v-model="cameraForm.password"
            type="password"
            autocomplete="new-password"
            :label="$t('page.kiosk.cameras.fieldPassword')"
            :hint="cameraForm.hasPassword
              ? $t('page.kiosk.cameras.fieldPasswordStoredHint')
              : $t('page.kiosk.cameras.fieldPasswordHint')"
            persistent-hint
            dense
            outlined
            class="mb-2"
          ></v-text-field>
          <v-text-field
            v-model.number="cameraForm.sortOrder"
            type="number"
            :label="$t('page.kiosk.cameras.fieldSortOrder')"
            dense
            outlined
            hide-details="auto"
            class="mb-2"
          ></v-text-field>
          <v-switch
            v-model="cameraForm.usedOnLivePage"
            :label="$t('page.kiosk.cameras.fieldUsedOnLivePage')"
            dense
            hide-details="auto"
            class="mt-2"
          ></v-switch>
          <v-switch
            v-model="cameraForm.usedOnEventsPage"
            :label="$t('page.kiosk.cameras.fieldUsedOnEventsPage')"
            dense
            hide-details="auto"
            class="mt-2"
          ></v-switch>
          <v-switch
            v-model="cameraForm.enabled"
            :label="$t('page.kiosk.cameras.fieldEnabled')"
            dense
            hide-details="auto"
            class="mt-2 mb-2"
          ></v-switch>

          <v-alert v-if="cameraFormError" dense outlined type="error" class="mb-0">
            {{ cameraFormError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="cameraDialog = false">{{ $t('page.kiosk.cameras.cancel') }}</v-btn>
          <v-btn
            text
            color="primary"
            :loading="cameraSaving"
            :disabled="!cameraFormValid"
            @click="submitCamera"
          >{{ $t('page.kiosk.cameras.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="nodeDialog" max-width="480" :fullscreen="$vuetify.breakpoint.xsOnly" scrollable>
      <v-card>
        <v-card-title>
          {{ nodeForm.id === null ? $t('page.kiosk.cameras.createNodeTitle') : $t('page.kiosk.cameras.editNodeTitle') }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="nodeForm.name"
            :label="$t('page.kiosk.cameras.fieldNodeName')"
            :rules="[requiredRule]"
            validate-on-blur
            dense
            outlined
            hide-details="auto"
            class="mb-2"
          ></v-text-field>
          <v-text-field
            v-model="nodeForm.frigateBaseUrl"
            :label="$t('page.kiosk.cameras.fieldFrigateBaseUrl')"
            :rules="[requiredRule, urlRule]"
            validate-on-blur
            dense
            outlined
            hide-details="auto"
            class="mb-2"
          ></v-text-field>
          <v-text-field
            v-model="nodeForm.streamBaseUrl"
            :label="$t('page.kiosk.cameras.fieldStreamBaseUrl')"
            :hint="$t('page.kiosk.cameras.fieldStreamBaseUrlHint')"
            persistent-hint
            dense
            outlined
            class="mb-2"
          ></v-text-field>
          <v-switch
            v-model="nodeForm.enabled"
            :label="$t('page.kiosk.cameras.fieldEnabled')"
            dense
            hide-details="auto"
            class="mt-2 mb-2"
          ></v-switch>

          <v-alert v-if="nodeFormError" dense outlined type="error" class="mb-0">
            {{ nodeFormError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="nodeDialog = false">{{ $t('page.kiosk.cameras.cancel') }}</v-btn>
          <v-btn
            text
            color="primary"
            :loading="nodeSaving"
            :disabled="!nodeFormValid"
            @click="saveNode"
          >{{ $t('page.kiosk.cameras.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CameraSetupAssistant
      v-model="assistantDialog"
      :nodes="nodes"
      :cameras="cameras"
      :presetNodeId="assistantNodeId"
      @nodes-changed="loadNodes"
      @created="onCameraCreated"
    ></CameraSetupAssistant>

    <CameraStreamSettings
      v-model="streamSettingsDialog"
      :camera="streamSettingsCamera"
      @saved="loadCameras"
    ></CameraStreamSettings>

    <CameraNodeDialog
      v-model="nodeDetailDialog"
      :node="nodeDetailNode"
      :cameras="nodeDetailCameras"
      :testResult="nodeDetailNode ? nodeTestResults[nodeDetailNode.id] : null"
      :testing="nodeDetailNode ? testingNodeId === nodeDetailNode.id : false"
      @test="testNode"
      @edit="openEditNode"
      @delete="requestDeleteNode"
      @add-camera="openAssistantForNode"
    ></CameraNodeDialog>

    <ConfirmDialog
      ref="confirmDialog"
      :confirmText="$t('page.kiosk.cameras.confirm')"
      :cancelText="$t('page.kiosk.cameras.cancel')"
    ></ConfirmDialog>
  </div>
</template>

<script type="js">
import { mapActions } from 'vuex'
import KioskLinkPanel from '@/components/KioskLinkPanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CameraSetupAssistant from '@/components/CameraSetupAssistant.vue'
import CameraStreamSettings from '@/components/CameraStreamSettings.vue'
import CameraNodeDialog from '@/components/CameraNodeDialog.vue'
import { cameraDisplay } from '@/mixins/cameraDisplay'
import { singleton as camerasService } from '@/utils/webservices/camerasService'
import { singleton as dateUtils } from '@/utils/dateUtils'

const emptyCameraForm = () => ({
  id: null,
  nodeId: null,
  displayName: '',
  frigateKey: '',
  // The URLs, the streams, the assignment and the two settings blocks are
  // carried through the form without being shown: they are edited in the stream
  // settings, and an edit here must not drop what it does not display.
  sourceUrl: '',
  liveSourceUrl: '',
  detectSourceUrl: '',
  streams: [],
  roles: {},
  recording: null,
  detect: null,
  username: '',
  // Always empty when the form opens - a stored password is never fetched and
  // never rendered; `hasPassword` is all the server tells us about it.
  password: '',
  hasPassword: false,
  usedOnLivePage: false,
  usedOnEventsPage: false,
  sortOrder: 0,
  enabled: true,
  // what the key was when the form opened, so a *change* to it can be told
  // apart from an edit that leaves it alone
  originalFrigateKey: null
})

const emptyNodeForm = () => ({
  id: null,
  name: '',
  frigateBaseUrl: '',
  streamBaseUrl: '',
  enabled: true
})

export default {
  name: 'kioskCameras',

  mixins: [cameraDisplay],

  components: {
    KioskLinkPanel,
    ConfirmDialog,
    CameraSetupAssistant,
    CameraStreamSettings,
    CameraNodeDialog
  },

  data: () => ({
    cameras: [],
    camerasLoading: true,
    camerasFetchError: false,
    cameraDeleteError: null,

    nodes: [],
    nodesLoading: true,
    nodesFetchError: false,
    nodeDeleteError: null,

    cameraDialog: false,
    cameraForm: emptyCameraForm(),
    cameraSaving: false,
    cameraFormError: null,

    // the assistant replaces the create dialog; the edit dialog above stays a
    // form, as the spec requires
    assistantDialog: false,
    assistantNodeId: null,

    streamSettingsDialog: false,
    streamSettingsCamera: null,

    nodeDetailDialog: false,
    nodeDetailNode: null,

    nodeDialog: false,
    nodeForm: emptyNodeForm(),
    nodeSaving: false,
    nodeFormError: null,

    // the outcome of a test triggered on this page, per entry id; the stored
    // last-known status is a separate, always-shown line
    cameraTestResults: {},
    nodeTestResults: {},
    testingCameraId: null,
    testingNodeId: null,

    dateUtils
  }),

  computed: {
    hasNodes () {
      return this.nodes.length > 0
    },

    nodeItems () {
      return this.nodes.map(node => ({ value: node.id, text: node.name }))
    },

    nodeDetailCameras () {
      return this.nodeDetailNode
        ? this.cameras.filter(camera => camera.nodeId === this.nodeDetailNode.id)
        : []
    },

    cameraFormValid () {
      const form = this.cameraForm
      return !!(form.nodeId !== null && form.nodeId !== undefined &&
        form.displayName && form.frigateKey && form.sourceUrl)
    },

    nodeFormValid () {
      return !!(this.nodeForm.name && this.isAbsoluteUrl(this.nodeForm.frigateBaseUrl))
    }
  },

  methods: {
    requiredRule (value) {
      return (value !== null && value !== undefined && value !== '') || this.$t('page.kiosk.cameras.required')
    },

    urlRule (value) {
      return this.isAbsoluteUrl(value) || this.$t('page.kiosk.cameras.invalidUrl')
    },

    isAbsoluteUrl (value) {
      return typeof value === 'string' && /^https?:\/\/.+/.test(value.trim())
    },

    nodeName (nodeId) {
      const node = this.nodes.find(candidate => candidate.id === nodeId)
      return node ? node.name : this.$t('page.kiosk.cameras.unknownNode')
    },

    async loadCameras () {
      this.camerasLoading = true
      this.camerasFetchError = false
      try {
        this.cameras = await camerasService.getCameras()
      } catch (err) {
        this.camerasFetchError = true
      }
      this.camerasLoading = false
    },

    async loadNodes () {
      this.nodesLoading = true
      this.nodesFetchError = false
      try {
        this.nodes = await camerasService.getNodes()
      } catch (err) {
        this.nodesFetchError = true
      }
      this.nodesLoading = false
    },

    /**
     * Adding a camera runs through the assistant, which owns the whole draft
     * until its final confirm - see the `camera-setup-assistant` capability.
     * `nodeId` is set when the assistant is opened for one node, which answers
     * its first step.
     */
    openAssistant (nodeId) {
      this.assistantNodeId = nodeId
      this.assistantDialog = true
    },

    openAssistantForNode (node) {
      this.nodeDetailDialog = false
      this.openAssistant(node.id)
    },

    async onCameraCreated () {
      await this.loadCameras()
    },

    openStreamSettings (camera) {
      this.streamSettingsCamera = camera
      this.streamSettingsDialog = true
    },

    openNodeDetail (node) {
      this.nodeDetailNode = node
      this.nodeDetailDialog = true
    },

    openEditCamera (camera) {
      this.cameraFormError = null
      this.cameraForm = Object.assign(emptyCameraForm(), {
        id: camera.id,
        nodeId: camera.nodeId,
        displayName: camera.displayName,
        frigateKey: camera.frigateKey,
        sourceUrl: camera.sourceUrl,
        liveSourceUrl: camera.liveSourceUrl || '',
        detectSourceUrl: camera.detectSourceUrl || '',
        streams: camera.streams,
        roles: camera.roles,
        recording: camera.recording,
        detect: camera.detect,
        username: camera.username || '',
        hasPassword: !!camera.hasPassword,
        usedOnLivePage: camera.usedOnLivePage,
        usedOnEventsPage: camera.usedOnEventsPage,
        sortOrder: camera.sortOrder,
        enabled: camera.enabled,
        originalFrigateKey: camera.frigateKey
      })
      this.cameraDialog = true
    },

    /**
     * Frigate keys its recordings by camera name, so changing the key on an
     * existing camera leaves everything recorded under the old one behind. That
     * is worth a confirmation; a new camera and every other field are not.
     */
    submitCamera () {
      if (!this.cameraFormValid) {
        return
      }
      const form = this.cameraForm
      if (form.frigateKey !== form.originalFrigateKey) {
        this.$refs.confirmDialog.open(
          this.$t('page.kiosk.cameras.frigateKeyChangeConfirm', {
            oldKey: form.originalFrigateKey,
            newKey: form.frigateKey
          }),
          () => this.saveCamera()
        )
        return
      }
      this.saveCamera()
    },

    cameraPayload () {
      const form = this.cameraForm
      const payload = {
        nodeId: form.nodeId,
        displayName: form.displayName,
        frigateKey: form.frigateKey,
        sourceUrl: form.sourceUrl,
        liveSourceUrl: form.liveSourceUrl || null,
        detectSourceUrl: form.detectSourceUrl || null,
        streams: form.streams,
        roles: form.roles,
        recording: form.recording,
        detect: form.detect,
        username: form.username || null,
        usedOnLivePage: form.usedOnLivePage,
        usedOnEventsPage: form.usedOnEventsPage,
        sortOrder: Number(form.sortOrder) || 0,
        enabled: form.enabled
      }
      // An empty field means "leave the stored password alone": the server keeps
      // what it has when the field is absent, so it is only ever sent when the
      // user actually typed a new one.
      if (form.password) {
        payload.password = form.password
      }
      return payload
    },

    async saveCamera () {
      this.cameraSaving = true
      this.cameraFormError = null
      try {
        await camerasService.updateCamera(this.cameraForm.id, this.cameraPayload())
        this.cameraDialog = false
        await this.loadCameras()
      } catch (err) {
        // The dialog deliberately stays open with everything the user typed
        // still in it, so a refused write can be corrected rather than retyped.
        this.cameraFormError = this.errorMessage(err)
      }
      this.cameraSaving = false
    },

    requestDeleteCamera (camera) {
      this.cameraDeleteError = null
      this.$refs.confirmDialog.open(
        this.$t('page.kiosk.cameras.deleteCameraConfirm', { name: camera.displayName }),
        () => this.deleteCamera(camera)
      )
    },

    async deleteCamera (camera) {
      this.cameraDeleteError = null
      try {
        await camerasService.deleteCamera(camera.id)
        await this.loadCameras()
      } catch (err) {
        this.cameraDeleteError = this.errorMessage(err)
      }
    },

    async testCamera (camera) {
      this.testingCameraId = camera.id
      this.$set(this.cameraTestResults, camera.id, null)
      try {
        const result = await camerasService.testCamera(camera.id)
        this.$set(this.cameraTestResults, camera.id, {
          result: result && result.result === 'ok' ? 'ok' : 'error',
          reason: result ? result.reason : null
        })
      } catch (err) {
        this.$set(this.cameraTestResults, camera.id, { result: 'error', reason: this.errorMessage(err) })
      }
      this.testingCameraId = null
      // the test stored a new last-known status on the server; pick it up
      await this.loadCameras()
    },

    openCreateNode () {
      this.nodeFormError = null
      this.nodeForm = emptyNodeForm()
      this.nodeDialog = true
    },

    openEditNode (node) {
      this.nodeFormError = null
      this.nodeForm = Object.assign(emptyNodeForm(), {
        id: node.id,
        name: node.name,
        frigateBaseUrl: node.frigateBaseUrl,
        streamBaseUrl: node.streamBaseUrl || '',
        enabled: node.enabled
      })
      this.nodeDialog = true
    },

    async saveNode () {
      if (!this.nodeFormValid) {
        return
      }
      this.nodeSaving = true
      this.nodeFormError = null
      const payload = {
        name: this.nodeForm.name,
        frigateBaseUrl: this.nodeForm.frigateBaseUrl.trim(),
        streamBaseUrl: this.nodeForm.streamBaseUrl ? this.nodeForm.streamBaseUrl.trim() : null,
        enabled: this.nodeForm.enabled
      }
      try {
        if (this.nodeForm.id === null) {
          await camerasService.createNode(payload)
          await this.loadNodes()
        } else {
          await camerasService.updateNode(this.nodeForm.id, payload)
          await this.loadNodes()
        }
        this.nodeDialog = false
      } catch (err) {
        this.nodeFormError = this.errorMessage(err)
      }
      this.nodeSaving = false
    },

    requestDeleteNode (node) {
      this.nodeDeleteError = null
      this.$refs.confirmDialog.open(
        this.$t('page.kiosk.cameras.deleteNodeConfirm', { name: node.name }),
        () => this.deleteNode(node)
      )
    },

    /**
     * A node that still holds cameras is refused by the server; nothing is
     * deleted and the reason it gave says which way out there is.
     */
    async deleteNode (node) {
      this.nodeDeleteError = null
      try {
        await camerasService.deleteNode(node.id)
        await this.loadNodes()
      } catch (err) {
        this.nodeDeleteError = this.errorMessage(err)
      }
    },

    async testNode (node) {
      this.testingNodeId = node.id
      this.$set(this.nodeTestResults, node.id, null)
      try {
        const result = await camerasService.testNode(node.id)
        this.$set(this.nodeTestResults, node.id, {
          result: result && result.result === 'ok' ? 'ok' : 'error',
          reason: result ? result.reason : null
        })
      } catch (err) {
        this.$set(this.nodeTestResults, node.id, { result: 'error', reason: this.errorMessage(err) })
      }
      this.testingNodeId = null
      await this.loadNodes()
      // `loadNodes` replaces the array, so the open detail dialog would keep a
      // node object that no longer carries the status the test just stored
      if (this.nodeDetailNode) {
        this.nodeDetailNode = this.nodes.find(candidate => candidate.id === this.nodeDetailNode.id) || null
        this.nodeDetailDialog = !!this.nodeDetailNode
      }
    },

    ...mapActions('gui', {
      kioskMode: 'kioskMode'
    })
  },

  mounted () {
    // Reached straight from the kiosk overview like KioskLights, so this view
    // turns kiosk mode on itself, unlike the pages one hop further in.
    this.kioskMode(true)
    // Only the stored last-known status is read here. Testing is an explicit
    // per-row action, so opening the page never waits on an unreachable node.
    this.loadNodes()
    this.loadCameras()
  }
}
</script>

<style lang="scss">
@import 'index.scss';

.cameras-content {
  max-width: none;
  /* the back button is fixed over the bottom left corner: keep the list clear
     of it, same padding convention as personen-verwaltung-content */
  padding: 8px 8px 100px 8px;
}

.cameras-back-btn {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 20;
}

/* A row carries more than a title and one subtitle - the source URL, the stored
   status, a provisioning reason and a test outcome all have to stay readable,
   and Vuetify's list lines truncate to one line each by default. */
.cameras-row .v-list-item__title,
.cameras-row .cameras-line {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

.cameras-row {
  padding-top: 8px;
  padding-bottom: 8px;
}

.cameras-actions {
  flex-direction: row;
  align-items: center;
  align-self: flex-start;
  margin: 0;
}
</style>
