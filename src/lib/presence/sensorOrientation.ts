export interface SensorOrientation {
  yawDeg: number;
  pxPerMeter: number;
}

export const SENSOR_ORIENTATION: Record<number, SensorOrientation> = {
  // 206: { yawDeg: 0, pxPerMeter: 40 },
}

export const DEFAULT_ORIENTATION: SensorOrientation = { yawDeg: 0, pxPerMeter: 40 }

const warned = new Set<number>()

export function orientationFor (applianceId: number): SensorOrientation {
  const entry = SENSOR_ORIENTATION[applianceId]
  if (entry) {
    return entry
  }
  if (!warned.has(applianceId)) {
    warned.add(applianceId)
    // eslint-disable-next-line no-console
    console.warn('[sensorOrientation] no entry for appliance id', applianceId, '— using DEFAULT_ORIENTATION')
  }
  return DEFAULT_ORIENTATION
}
