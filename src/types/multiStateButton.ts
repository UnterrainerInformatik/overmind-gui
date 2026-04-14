import { singleton as eventsService } from '@/utils/webservices/eventsService'
import { singleton as plansService } from '@/utils/webservices/plansService'

export interface EventTriggerAction {
  kind: 'event-trigger';
  applianceId: number;
  sensorPath: string;
  eventPath: string;
}

export interface PlanToggleAction {
  kind: 'plan-toggle';
  planId: number;
}

export type MultiStateAction = EventTriggerAction | PlanToggleAction

export interface MultiStateState {
  id: string;
  label: string;
  icon?: string;
  planIdForCheckIfOn?: number;
  onAction?: MultiStateAction;
  offAction?: MultiStateAction;
  description?: string;
}

export interface MultiStateButtonConfig {
  id: string;
  label: string;
  icon?: string;
  defaultStateId: string;
  states: MultiStateState[];
}

const PLAN_TOGGLE_APPLIANCE_ID = 20
const PLAN_TOGGLE_ACTOR_PATH = 'actor'

export async function dispatchMultiStateAction (action: MultiStateAction | undefined): Promise<unknown> {
  if (!action) {
    return
  }
  if (action.kind === 'event-trigger') {
    return eventsService.trigger(() => ({
      applianceId: action.applianceId,
      sensorPath: action.sensorPath,
      eventPath: action.eventPath
    }))
  }
  if (action.kind === 'plan-toggle') {
    return plansService.execute(() => ({
      applianceId: PLAN_TOGGLE_APPLIANCE_ID,
      actorPath: PLAN_TOGGLE_ACTOR_PATH,
      commands: [
        {
          name: 'toggle',
          params: [[action.planId]]
        }
      ]
    }))
  }
}
