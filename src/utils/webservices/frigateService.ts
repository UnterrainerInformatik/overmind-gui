import axios from 'axios'

export interface FrigateTrackedPersonData {
  box: [number, number, number, number];
  score: number;
  sub_label_score: number | null;
}

export interface FrigateTrackedPerson {
  id: string;
  camera: string;
  label: string;
  sub_label: string | null;
  zones: string[];
  data: FrigateTrackedPersonData;
}

/**
 * Talks directly to a home Frigate instance (not java-overmind-server), so this is kept
 * outside BaseService/rest.ts, which assume the overmind auth/base-path conventions.
 */
export class FrigateService {
  private static instanceField: FrigateService
  private baseUrl = 'https://frig.unterrainer.info'

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new FrigateService())
    }
    return this.instanceField
  }

  /**
   * Returns the currently in-progress ("still being tracked") person events for the given
   * camera, i.e. rows from GET /api/events with end_time === null. Frigate has no dedicated
   * "currently active tracked objects" endpoint (see design.md - Context).
   */
  public async getTrackedPersons (camera: string, limit = 50): Promise<FrigateTrackedPerson[]> {
    const response = await axios.get(`${this.baseUrl}/api/events`, {
      params: { cameras: camera, limit }
    })
    const events: any[] = response.data || []
    return events
      .filter(event => event.end_time === null && event.label === 'person')
      .map(event => ({
        id: event.id,
        camera: event.camera,
        label: event.label,
        sub_label: event.sub_label,
        zones: event.zones || [],
        data: {
          box: event.data.box,
          score: event.data.score,
          sub_label_score: event.data.sub_label_score
        }
      }))
  }
}

export const singleton = FrigateService.getInstance()
