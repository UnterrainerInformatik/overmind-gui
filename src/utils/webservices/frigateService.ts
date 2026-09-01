import { singleton as axiosUtils } from '@/utils/axiosUtils'

export interface FrigateTrackedPersonData {
  box: [number, number, number, number];
  score: number;
  sub_label_score: number | null;
}

export interface FrigateTrackedPerson {
  id: string;
  /** the overmind camera id this came from, not a Frigate camera key */
  camera: number;
  label: string;
  sub_label: string | null;
  zones: string[];
  data: FrigateTrackedPersonData;
}

export interface FrigatePastEvent {
  id: string;
  /** the overmind camera id this came from, not a Frigate camera key */
  camera: number;
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

/** What a client needs to open the live stream overmind relays for a camera. */
export interface CameraStreamHandle {
  url: string;
  mode: string;
}

/**
 * Person detections and live video for a camera, addressed by its overmind
 * camera id. Overmind resolves the id to the node that holds the camera and
 * forwards there, so nothing here knows a node address or a Frigate camera key
 * - which is why this is an ordinary rest.ts service and no longer the
 * documented BaseService exception it used to be.
 *
 * The contract it is written against (java-overmind-server change
 * camera-registry-and-node-routing, whose specs pin the two routes but not the
 * media paths or the payload shapes):
 *
 *   GET /cameras/{id}/stream
 *     -> { "url": "<ws(s):// or /path>", "mode": "mse" }
 *     `mode` is what overmind can relay; it defaults to MSE here, because
 *     WebRTC would carry the media past overmind (see design.md).
 *
 *   GET /cameras/{id}/events?label=person&limit=&after=&before=&subLabel=
 *     -> { "entries": [ event, ... ] }   (a bare array is accepted too)
 *     Completed events, most recent first. `before` is exclusive, which is what
 *     paging uses as its cursor.
 *
 *   GET /cameras/{id}/events?inProgress=true&label=person&limit=
 *     -> the events the node reports as still running, each additionally
 *        carrying `box`, `score` and `subLabelScore` for the overlay.
 *
 *   event: { id, cameraId, label, subLabel, zones[], startTime, endTime,
 *            hasClip, hasSnapshot }   - seconds, camelCase, `endTime` null
 *            while an event is still in progress.
 *
 *   GET /cameras/{id}/events/{eventId}/thumbnail.jpg | snapshot.jpg | clip.mp4
 *     -> the media itself, fetched by the browser through <img>/<video>.
 *
 * The `FrigateTrackedPerson` / `FrigatePastEvent` result shapes are unchanged
 * from when this talked to Frigate directly, so the pages consuming them did
 * not have to move with it; only `camera` now carries the overmind camera id.
 */
export class FrigateService {
  private static instanceField: FrigateService

  protected server = 'uinf'

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new FrigateService())
    }
    return this.instanceField
  }

  /**
   * Where to open the live stream for a camera. The URL addresses overmind, not
   * the node, so it works from a tablet with no route into the node's network.
   */
  public async getStreamHandle (cameraId: number): Promise<CameraStreamHandle> {
    const response = await axiosUtils.getFromPath(this.server, 'cameraStream', { id: cameraId })
    const url = response && response.url ? response.url : ''
    return {
      // a relative handle is resolved against overmind, so the server is free to
      // answer with either
      url: /^(ws|http)s?:\/\//.test(url) ? url : `${axiosUtils.baseUrlOf(this.server)}${url}`,
      mode: (response && response.mode) || 'mse'
    }
  }

  /**
   * The persons currently being tracked on a camera, i.e. the events the node
   * reports as not yet ended.
   */
  public async getTrackedPersons (cameraId: number, limit = 50): Promise<FrigateTrackedPerson[]> {
    const response = await axiosUtils.getFromPath(
      this.server, 'cameraEvents', { id: cameraId }, `inProgress=true&label=person&limit=${limit}`)
    return this.entriesOf(response).map(event => ({
      id: event.id,
      camera: cameraId,
      label: event.label,
      // The overlay component reads these names; they are the result shape this
      // service has always had, not the wire format any more.
      // eslint-disable-next-line @typescript-eslint/camelcase
      sub_label: event.subLabel,
      zones: event.zones || [],
      data: {
        box: event.box,
        score: event.score,
        // eslint-disable-next-line @typescript-eslint/camelcase
        sub_label_score: event.subLabelScore
      }
    }))
  }

  /**
   * Completed person events for one camera, most recent first, under the given
   * name/date-range filters. `cursor` is the `startTime` of the oldest event of
   * a previous page; `before` is exclusive of that exact timestamp, so it never
   * re-returns it. Without a cursor, `filters.before` bounds the first page.
   */
  public async getPastEvents (
    cameraId: number,
    filters: FrigatePastEventFilters = {},
    cursor: number | null = null,
    limit = 30
  ): Promise<FrigatePastEvent[]> {
    const params = [`label=person&limit=${limit}`]
    if (filters.name) {
      params.push(`subLabel=${encodeURIComponent(filters.name)}`)
    }
    if (filters.after !== null && filters.after !== undefined) {
      params.push(`after=${filters.after}`)
    }
    const before = cursor !== null && cursor !== undefined ? cursor : filters.before
    if (before !== null && before !== undefined) {
      params.push(`before=${before}`)
    }
    const response = await axiosUtils.getFromPath(this.server, 'cameraEvents', { id: cameraId }, params.join('&'))
    return this.entriesOf(response)
      .filter(event => event.endTime !== null && event.endTime !== undefined)
      .map(event => ({
        id: event.id,
        camera: cameraId,
        subLabel: event.subLabel,
        zones: event.zones || [],
        startTime: event.startTime,
        endTime: event.endTime,
        hasClip: !!event.hasClip,
        hasSnapshot: !!event.hasSnapshot
      }))
  }

  public getEventThumbnailUrl (cameraId: number, eventId: string): string {
    return axiosUtils.urlFor(this.server, 'cameraEventThumbnail', { id: cameraId, eventId })
  }

  public getEventSnapshotUrl (cameraId: number, eventId: string): string {
    return axiosUtils.urlFor(this.server, 'cameraEventSnapshot', { id: cameraId, eventId })
  }

  public getEventClipUrl (cameraId: number, eventId: string): string {
    return axiosUtils.urlFor(this.server, 'cameraEventClip', { id: cameraId, eventId })
  }

  /** Overmind's list envelope, tolerating a bare array. */
  private entriesOf (response: any): any[] {
    if (Array.isArray(response)) {
      return response
    }
    return (response && response.entries) || []
  }
}

export const singleton = FrigateService.getInstance()
