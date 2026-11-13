import Vue from 'vue'
import { singleton as appliancesService } from '@/utils/webservices/appliancesService'
import { indexAppliances, PlanAppliance } from '@/utils/audioPlanGeometry'

/**
 * The appliance list behind the audio plan popup's room areas (openspec change
 * `kiosk-audio-plan-popup`, design D3): loaded on the first open, kept for the
 * page session and refreshed in the background on every later open, so the
 * plan is drawn at once from the list it already has. `failed` is true only
 * while no list ever arrived and the last load failed; the popup then shows
 * every room as a chip.
 */
export interface PlanAppliancesStore {
  index: Map<number, PlanAppliance> | null;
  failed: boolean;
}

export const planAppliances: PlanAppliancesStore = Vue.observable({
  index: null,
  failed: false
})

let loading: Promise<void> | null = null

export function refreshPlanAppliances (): Promise<void> {
  if (loading) {
    return loading
  }
  loading = (async () => {
    try {
      const response = await appliancesService.getList()
      if (!response || !Array.isArray(response.entries)) {
        throw new Error('no appliance list')
      }
      planAppliances.index = indexAppliances(response.entries)
      planAppliances.failed = false
    } catch {
      // a list from an earlier open stays; only none at all counts as failed
      planAppliances.failed = planAppliances.index === null
    } finally {
      loading = null
    }
  })()
  return loading
}
