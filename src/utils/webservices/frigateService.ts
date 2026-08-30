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

export interface FrigatePastEvent {
  id: string;
  camera: string;
  subLabel: string | null;
  zones: string[];
  startTime: number;
  endTime: number;
  hasClip: boolean;
  hasSnapshot: boolean;
}

export interface FrigatePastEventFilters {
  name?: string | null;
  after?: number | null;
  before?: number | null;
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

  /**
   * Returns completed (end_time !== null) person events for the given camera, most recent
   * first, applying the given name/date-range filters. `cursor` is the `startTime` of the
   * oldest event from a previous call, used to page in older events (GET /api/events'
   * `before` param is exclusive of that exact timestamp, so it never re-returns it); when
   * omitted, `filters.before` is used instead so the first page already honours the date-range
   * filter's upper bound. Confirmed against the running instance (see tasks.md 1.1):
   * `cameras`/`label`/`sub_labels`/`after`/`before` filter server-side and results already come
   * back sorted most-recent-first, so only the in-progress case needs a client-side filter.
   */
  public async getPastEvents (
    camera: string,
    filters: FrigatePastEventFilters = {},
    cursor: number | null = null,
    limit = 30
  ): Promise<FrigatePastEvent[]> {
    const params: any = { cameras: camera, label: 'person', limit }
    if (filters.name) {
      params.sub_labels = filters.name
    }
    if (filters.after !== null && filters.after !== undefined) {
      params.after = filters.after
    }
    const before = cursor !== null && cursor !== undefined ? cursor : filters.before
    if (before !== null && before !== undefined) {
      params.before = before
    }
    const response = await axios.get(`${this.baseUrl}/api/events`, { params })
    const events: any[] = response.data || []
    return events
      .filter(event => event.end_time !== null)
      .map(event => ({
        id: event.id,
        camera: event.camera,
        subLabel: event.sub_label,
        zones: event.zones || [],
        startTime: event.start_time,
        endTime: event.end_time,
        hasClip: !!event.has_clip,
        hasSnapshot: !!event.has_snapshot
      }))
  }

  /** Confirmed against the running instance (see tasks.md 1.2): no auth required. */
  public getEventThumbnailUrl (id: string): string {
    return `${this.baseUrl}/api/events/${encodeURIComponent(id)}/thumbnail.jpg`
  }

  /** Confirmed against the running instance (see tasks.md 1.2): no auth required. */
  public getEventSnapshotUrl (id: string): string {
    return `${this.baseUrl}/api/events/${encodeURIComponent(id)}/snapshot.jpg`
  }

  /** Confirmed against the running instance (see tasks.md 1.2): no auth required. */
  public getEventClipUrl (id: string): string {
    return `${this.baseUrl}/api/events/${encodeURIComponent(id)}/clip.mp4`
  }
}

export const singleton = FrigateService.getInstance()
