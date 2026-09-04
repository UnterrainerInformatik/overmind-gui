<template>
  <v-dialog
    :value="value"
    max-width="640"
    :fullscreen="$vuetify.breakpoint.xsOnly"
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card v-if="node" class="node-detail">
      <v-card-title class="d-flex align-center flex-wrap">
        <span class="mr-2">{{ node.name }}</span>
        <v-chip
          x-small
          outlined
          :color="node.enabled ? 'success' : 'warning'"
        >{{ node.enabled ? $t('page.kiosk.cameras.enabledYes') : $t('page.kiosk.cameras.enabledNo') }}</v-chip>
      </v-card-title>
      <v-card-text>
        <div class="node-detail-url">{{ node.frigateBaseUrl }}</div>
        <div v-if="node.streamBaseUrl" class="node-detail-stream-url">{{ node.streamBaseUrl }}</div>

        <div class="mt-2 node-detail-status" :class="statusClass(node)">{{ statusText(node) }}</div>
        <div v-if="testResult" class="node-detail-test" :class="testResult.result === 'ok' ? 'success--text' : 'error--text'">
          {{ testText(testResult) }}
        </div>

        <!-- What the node last reported about itself. Null is rendered as
             unknown rather than as 0 GB or 0 days, because "no storage" and
             "the node never said" are different facts about a node. -->
        <div class="mt-3 node-detail-version">
          {{ $t('page.kiosk.cameras.nodeDetail.frigateVersion') }}:
          <span :class="{ 'text--disabled': !node.frigateVersion }">
            {{ node.frigateVersion || $t('page.kiosk.cameras.nodeDetail.unknown') }}
          </span>
        </div>
        <div class="node-detail-storage">
          {{ $t('page.kiosk.cameras.nodeDetail.storage') }}:
          <span :class="{ 'text--disabled': storageText === null }">
            {{ storageText === null ? $t('page.kiosk.cameras.nodeDetail.unknown') : storageText }}
          </span>
        </div>
        <div class="node-detail-retention">
          {{ $t('page.kiosk.cameras.nodeDetail.defaultRetention') }}:
          <span :class="{ 'text--disabled': retentionText === null }">
            {{ retentionText === null ? $t('page.kiosk.cameras.nodeDetail.unknown') : retentionText }}
          </span>
        </div>

        <div class="text-subtitle-1 mt-5 mb-1">{{ $t('page.kiosk.cameras.nodeDetail.camerasTitle') }}</div>

        <v-card v-if="!cameras.length" outlined class="pa-3 node-detail-empty">
          {{ $t('page.kiosk.cameras.nodeDetail.noCameras') }}
          <v-btn small text color="primary" class="mt-2 node-detail-add-camera-btn" @click="$emit('add-camera', node)">
            {{ $t('page.kiosk.cameras.addCamera') }}
          </v-btn>
        </v-card>

        <v-list v-else outlined class="node-detail-camera-list">
          <v-list-item v-for="camera in cameras" :key="camera.id" class="node-detail-camera-row">
            <v-list-item-content>
              <v-list-item-title class="d-flex align-center flex-wrap">
                <span class="mr-2">{{ camera.displayName }}</span>
                <v-chip
                  x-small
                  outlined
                  :color="camera.enabled ? 'success' : 'warning'"
                >{{ camera.enabled ? $t('page.kiosk.cameras.enabledYes') : $t('page.kiosk.cameras.enabledNo') }}</v-chip>
              </v-list-item-title>
              <v-list-item-subtitle class="cameras-line node-detail-camera-assignment">
                {{ assignmentText(camera) }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <!-- The page keeps the only implementation of these three; the dialog
             asks for them and shows what came back. -->
        <v-btn text :loading="testing" class="node-detail-test-btn" @click="$emit('test', node)">
          {{ $t('page.kiosk.cameras.test') }}
        </v-btn>
        <v-btn text class="node-detail-edit-btn" @click="$emit('edit', node)">
          {{ $t('page.kiosk.cameras.edit') }}
        </v-btn>
        <v-btn text color="error" class="node-detail-delete-btn" @click="$emit('delete', node)">
          {{ $t('page.kiosk.cameras.delete') }}
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn text class="node-detail-close-btn" @click="$emit('input', false)">
          {{ $t('page.kiosk.cameras.nodeDetail.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="js">
import { cameraDisplay } from '@/mixins/cameraDisplay'
import { singleton as cameraUtils } from '@/utils/cameraUtils'

export default {
  name: 'cameraNodeDialog',

  mixins: [cameraDisplay],

  props: {
    value: { type: Boolean, default: false },
    node: { type: Object, default: null },
    cameras: { type: Array, default: () => [] },
    testResult: { type: Object, default: null },
    testing: { type: Boolean, default: false }
  },

  computed: {
    storageText () {
      const used = cameraUtils.gigabytes(this.node.storageUsedBytes)
      const total = cameraUtils.gigabytes(this.node.storageTotalBytes)
      if (used === null && total === null) {
        return null
      }
      return this.$t('page.kiosk.cameras.nodeDetail.storageValue', {
        used: used === null ? '?' : used,
        total: total === null ? '?' : total
      })
    },

    /**
     * The retention this node applies to a camera that sets none of its own -
     * the fallback the stream settings name under an empty retention field, so
     * the two say the same number.
     */
    retentionText () {
      const days = this.node.defaultRetentionDays
      return days === null || days === undefined
        ? null
        : this.$t('page.kiosk.cameras.nodeDetail.defaultRetentionValue', { days })
    }
  }
}
</script>
