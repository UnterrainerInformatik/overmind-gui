export interface SensorSpec {
  hFovDeg: number;
  vFovDeg: number;
  rangeM: number;
}

const APOLLO_MTR1_FQN = 'info.unterrainer.server.overmindserver.vendors.apollo.appliances.ApolloMtr1Appliance'
const SHELLY_PRESENCE_G4_FQN = 'info.unterrainer.server.overmindserver.vendors.shelly.appliances.ShellyPresenceG4Appliance'

export const SENSOR_SPECS: Record<string, SensorSpec> = {
  [APOLLO_MTR1_FQN]: { hFovDeg: 120, vFovDeg: 70, rangeM: 6 },
  [SHELLY_PRESENCE_G4_FQN]: { hFovDeg: 140, vFovDeg: 120, rangeM: 8 }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function specForApp (app: any): SensorSpec | null {
  if (!app || !app.classFqn) {
    return null
  }
  return SENSOR_SPECS[app.classFqn] || null
}
