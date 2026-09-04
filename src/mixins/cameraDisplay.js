import { singleton as cameraUtils } from '@/utils/cameraUtils'
import { singleton as dateUtils } from '@/utils/dateUtils'

// What the server accepts as a stream name. Frigate keys its configuration by
// the name, so anything outside this set is refused there rather than here.
const STREAM_NAME = /^[a-z0-9_]+$/

/**
 * The wording the Kameras page, the node detail dialog and the setup assistant
 * all share: a stored status, a test outcome, a provisioning state, a stream
 * assignment and the reason behind a refused write.
 *
 * A mixin rather than a util class because every one of these needs `$t` and
 * the current locale, and passing both into a singleton at each call site is
 * more ceremony than the methods themselves.
 */
export const cameraDisplay = {
  methods: {
    /**
     * The reason the server gave, which is what the user has to see to correct
     * a refused write - a duplicate Frigate key, a node that still holds
     * cameras. axiosUtils carries it on the error; the generic text is only the
     * fallback for a failure that carried none.
     */
    errorMessage (err) {
      return (err && err.serverMessage) || this.$t('page.kiosk.cameras.saveError')
    },

    statusText (entry) {
      if (!entry || !entry.lastStatus) {
        return this.$t('page.kiosk.cameras.statusUnknown')
      }
      const at = dateUtils.isoToShortDateTime(entry.lastStatusAt, this.$i18n.locale)
      const key = entry.lastStatus === 'ok' ? 'statusOk' : 'statusError'
      const text = this.$t(`page.kiosk.cameras.${key}`, { at })
      return entry.lastStatus === 'ok' || !entry.lastStatusReason
        ? text
        : `${text} - ${entry.lastStatusReason}`
    },

    statusClass (entry) {
      if (!entry || !entry.lastStatus) {
        return 'text--disabled'
      }
      return entry.lastStatus === 'ok' ? 'success--text' : 'error--text'
    },

    testText (result) {
      if (result.result === 'ok') {
        return this.$t('page.kiosk.cameras.testOk')
      }
      return result.reason
        ? this.$t('page.kiosk.cameras.testFailedReason', { reason: result.reason })
        : this.$t('page.kiosk.cameras.testFailed')
    },

    testClass (result) {
      return result.result === 'ok' ? 'success--text' : 'error--text'
    },

    provisioningText (camera) {
      const key = camera.provisioningState === 'failed' ? 'provisioningFailed' : 'provisioningPending'
      const text = this.$t(`page.kiosk.cameras.${key}`)
      return camera.provisioningReason ? `${text} - ${camera.provisioningReason}` : text
    },

    provisioningClass (camera) {
      return camera.provisioningState === 'failed' ? 'error--text' : 'warning--text'
    },

    /**
     * What a camera's entry says instead of its raw URLs. A camera whose three
     * purposes sit on one stream says so once - naming the same stream three
     * times is noise on the common single-stream camera.
     */
    assignmentText (camera) {
      const assignment = cameraUtils.assignment(camera)
      return assignment.single
        ? this.$t('page.kiosk.cameras.assignmentSingle', { name: assignment.single })
        : this.$t('page.kiosk.cameras.assignmentRoles', assignment.roles)
    },

    shortTime (iso) {
      return dateUtils.isoToShortDateTime(iso, this.$i18n.locale)
    },

    /**
     * The three refusals the server makes that the page can make itself, each
     * returning the sentence to show or null when the value is acceptable.
     * Here rather than in either dialog so the stream settings and the setup
     * assistant refuse the same values and quote the same sentence - a rule
     * that differs between the two is worse than one that is only in one.
     */
    streamNameProblem (name) {
      return STREAM_NAME.test((name || '').trim())
        ? null
        : this.$t('page.kiosk.cameras.streams.streamNameInvalid')
    },

    streamUrlProblem (streams) {
      const missing = (streams || []).find(stream => !(stream.url || '').trim())
      return missing
        ? this.$t('page.kiosk.cameras.streams.streamUrlMissing', { name: missing.name })
        : null
    },

    /**
     * Only while recording is on: with it off the retention is not a setting at
     * all, and refusing an empty one there would block a save that is fine.
     */
    retentionProblem (recording) {
      if (!recording || !recording.enabled) {
        return null
      }
      const days = Number(recording.retentionDays)
      const stated = recording.retentionDays !== null && recording.retentionDays !== undefined &&
        recording.retentionDays !== ''
      return stated && !isNaN(days) && days > 0
        ? null
        : this.$t('page.kiosk.cameras.streams.retentionRequired')
    },

    /**
     * When a probe's measurement was taken: the node's own time, because it is
     * the node that measured. This device's clock is the fallback for a server
     * that sent none - a stream that was just measured must not read as never
     * probed.
     */
    measuredAt (measured) {
      return (measured && measured.probedAt) || new Date().toISOString().replace('Z', '')
    }
  }
}
