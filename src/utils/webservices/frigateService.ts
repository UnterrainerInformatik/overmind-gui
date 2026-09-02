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
  /**
   * Absolute URLs of the event's media on overmind, taken from the payload
   * rather than built here - the server sends them only for the media the node
   * actually has. Empty when there is none, which is what `hasClip` and
   * `hasSnapshot` say.
   */
  thumbnailUrl: string;
  snapshotUrl: string;
  clipUrl: string;
}

export interface FrigatePastEventFilters {
  name?: string | null;
  after?: number | null;
  before?: number | null;
}

/** A camera whose events are missing from a page, and why. */
export interface FrigateUnavailableCamera {
  cameraId: number;
  displayName: string | null;
  reason: string | null;
}

export interface FrigateEventsPage {
  events: FrigatePastEvent[];
  /** empty when every camera answered */
  unavailable: FrigateUnavailableCamera[];
  /**
   * How many events the server returned, before the name filter was applied
   * here. It is what tells "the server has no more" from "none of this page
   * matched the name", which a caller needs to decide whether to page on.
   */
  returned: number;
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
 * Written against, and verified 2026-09-02 on the deployed server,
 * `ai/draft-cameras-for-frontend.md` sections 6-7 in java-overmind-server:
 *
 *   GET /cameras/{id}/stream
 *     -> { cameraId, kind: "mse", url: "wss://<the host you called>/..." }
 *     An object, so the transport is read rather than assumed; `kind` is MSE
 *     because WebRTC's media would travel node-to-browser directly and neither
 *     survives the proxy nor keeps node addresses out of the browser.
 *
 *   GET /cameras/events?cameraIds=5,7&label=&after=&before=&limit=
 *     -> { events: [...], unavailable: [ { cameraId, displayName, reason } ] }
 *     Newest first, merged across cameras and nodes, one request per node
 *     rather than per camera. A node that is down does not fail the query - its
 *     cameras are named in `unavailable`, which is absent when all answered.
 *     `before` filters on the start time and is exclusive, which is what paging
 *     uses as its cursor.
 *
 *   GET /cameras/{id}/events?...     the same for one camera, where an
 *     unreachable node is a 502 rather than a partial result.
 *
 *   event: { eventId, cameraId, label, subLabel, startTime, endTime, score,
 *            snapshotUrl, thumbnailUrl, clipUrl }
 *     `endTime` is absent while an event is still in progress; the three media
 *     fields are absent when the node has no such media, so they are checked
 *     rather than built. Times are overmind's `LocalDateTime` in UTC in both
 *     directions - the node's epoch floats are converted at overmind's edge and
 *     never reach here - while this GUI's own pages work in epoch seconds, so
 *     both conversions happen in this service and nowhere else.
 *
 * Two things the route does not carry, and what this service does about them:
 *
 *   - **No zone names.** `zones` is therefore always empty, and the pages that
 *     show zones show none. The field stays because it is part of the result
 *     shape and starts working the day overmind forwards them.
 *   - **No bounding boxes, and no way to ask for in-progress events.** The live
 *     overlay needs `box` per detection, which no route offers; see
 *     `getTrackedPersons()`.
 *
 * There is also no filter by sub-label, so the events page's name filter is
 * applied here rather than by the server - see `getPastEvents()`.
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
    return {
      url: this.absoluteUrl(response && response.url),
      // the server calls the transport `kind`; `mode` is what go2rtc's element
      // wants it in, and MSE is the only one overmind relays
      mode: (response && (response.kind || response.mode)) || 'mse'
    }
  }

  /**
   * The persons currently being tracked on a camera: the events the node
   * reports as not yet ended, which is how this has always been read - Frigate
   * has no "currently tracked objects" route and overmind adds none.
   *
   * It yields nothing today, and that is not a fault of the caller. Overmind's
   * event payload carries no bounding box, and a detection without one cannot
   * be drawn over the video; a box-less event is therefore dropped here rather
   * than handed on to be drawn at an undefined position. The overlay then shows
   * no boxes over a live picture that keeps playing, which is the behaviour the
   * spec asks for when detections cannot be read. The day overmind carries
   * `box` (and `subLabelScore`) on an event, this starts working as it stands.
   */
  public async getTrackedPersons (cameraId: number, limit = 50): Promise<FrigateTrackedPerson[]> {
    const response = await axiosUtils.getFromPath(
      this.server, 'cameraEvents', { id: cameraId }, `label=person&limit=${limit}`)
    return this.eventsOf(response)
      .filter(event => event.endTime === null || event.endTime === undefined)
      .filter(event => !!event.box)
      .map(event => ({
        id: event.eventId,
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
   * One page of completed person events across several cameras, merged and
   * ordered most recent first. `cursor` is the `startTime` of the oldest event
   * of a previous page; `before` is exclusive of that exact timestamp, so it
   * never re-returns it. Without a cursor, `filters.before` bounds the first
   * page.
   *
   * `filters.name` is applied here: the route filters by `label` only. That is
   * also why `returned` is reported - a page can filter down to nothing and
   * still have older events behind it, and only the caller knows how far it
   * wants to keep asking.
   */
  public async getPastEvents (
    cameraIds: number[],
    filters: FrigatePastEventFilters = {},
    cursor: number | null = null,
    limit = 30
  ): Promise<FrigateEventsPage> {
    const params = [`cameraIds=${cameraIds.join(',')}`, 'label=person', `limit=${limit}`]
    if (filters.after !== null && filters.after !== undefined) {
      params.push(`after=${this.toLocalDateTime(filters.after)}`)
    }
    const before = cursor !== null && cursor !== undefined ? cursor : filters.before
    if (before !== null && before !== undefined) {
      params.push(`before=${this.toLocalDateTime(before)}`)
    }
    const response = await axiosUtils.getResponse(this.server, 'cameraEventsMerged', params.join('&'))
    const returned = this.eventsOf(response)
    const events = returned
      .filter(event => event.endTime !== null && event.endTime !== undefined)
      .filter(event => !filters.name || event.subLabel === filters.name)
      .map(event => this.toPastEvent(event))
    return {
      events,
      unavailable: ((response && response.unavailable) || []).map(entry => ({
        cameraId: entry.cameraId,
        displayName: entry.displayName || null,
        reason: entry.reason || null
      })),
      returned: returned.length
    }
  }

  private toPastEvent (event: any): FrigatePastEvent {
    return {
      id: event.eventId,
      camera: event.cameraId,
      subLabel: event.subLabel || null,
      // overmind's event route carries no zones; see the class comment
      zones: event.zones || [],
      startTime: this.toEpochSeconds(event.startTime) as number,
      endTime: this.toEpochSeconds(event.endTime) as number,
      hasClip: !!event.clipUrl,
      hasSnapshot: !!event.snapshotUrl,
      thumbnailUrl: this.absoluteUrl(event.thumbnailUrl),
      snapshotUrl: this.absoluteUrl(event.snapshotUrl),
      clipUrl: this.absoluteUrl(event.clipUrl)
    }
  }

  /**
   * A URL the browser can fetch by itself, out of a path the server sent. The
   * paths are relative so that no host - and above all no node address - is
   * baked into a payload; a server free to answer with an absolute one is
   * passed through unchanged.
   */
  private absoluteUrl (url: string | null | undefined): string {
    if (!url) {
      return ''
    }
    return /^(ws|http)s?:\/\//.test(url) ? url : `${axiosUtils.baseUrlOf(this.server)}${url}`
  }

  /**
   * Epoch seconds, as this GUI's pages count time, out of overmind's UTC
   * `LocalDateTime` - the same reading dateUtils applies to every other
   * timestamp from this server.
   */
  private toEpochSeconds (value: any): number | null {
    if (value === null || value === undefined) {
      return null
    }
    const ms = Date.parse(`${value}Z`)
    return Number.isFinite(ms) ? ms / 1000 : null
  }

  /**
   * The inverse, for `after` and `before`: `2026-09-01T19:54:23.224`.
   * Milliseconds are kept because the cursor is an event's exact start time and
   * `before` is exclusive of it - truncated to the second, a page would skip
   * whatever else started inside that second.
   */
  private toLocalDateTime (epochSeconds: number): string {
    return new Date(epochSeconds * 1000).toISOString().slice(0, 23)
  }

  /** Overmind's event envelope, tolerating a bare array. */
  private eventsOf (response: any): any[] {
    if (Array.isArray(response)) {
      return response
    }
    return (response && response.events) || []
  }
}

export const singleton = FrigateService.getInstance()
