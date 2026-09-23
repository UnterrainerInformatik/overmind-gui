/**
 * Hours as the unit a person would say them in, rounded: minutes under an
 * hour, hours under two days, days otherwise. Shared by the recording storage
 * gauge and the recording jobs' time remaining (openspec change
 * `camera-recording-jobs`, design.md D3), so both use the same thresholds and
 * the same plural strings.
 *
 * Rounded because neither caller has more precision to offer: a recording rate
 * fluctuates with motion and night, and a countdown ticks every 30 seconds.
 */
export const durationText = {
  methods: {
    duration (hours) {
      const scope = 'page.kiosk.cameras.storageGauge'
      if (hours < 1) {
        const minutes = Math.max(1, Math.round(hours * 60))
        return this.$tc(`${scope}.minutes`, minutes, { count: minutes })
      }
      if (hours < 48) {
        const rounded = Math.round(hours)
        return this.$tc(`${scope}.hours`, rounded, { count: rounded })
      }
      const days = Math.round(hours / 24)
      return this.$tc(`${scope}.days`, days, { count: days })
    }
  }
}
