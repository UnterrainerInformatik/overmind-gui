import { singleton as axiosUtils } from '@/utils/axiosUtils'
import { singleton as dateUtils } from '@/utils/dateUtils'

/**
 * One entry in the long-term archive. `startTime`, `endTime` and
 * `originExpiresAt` are epoch seconds here - the wire carries UTC
 * `LocalDateTime`, and this service is the only place that reading happens, the
 * same division of labour `frigateService` has for events.
 */
export interface ArchiveItem {
  archiveId: string;
  /** the overmind camera id the copy was made on */
  cameraId: number;
  cameraName: string | null;
  /** lowercased here - see lowered() */
  kind: ArchiveItemKind;
  /** the event this copy was made from - the key the events page joins on */
  sourceEventId: string | null;
  label: string | null;
  subLabel: string | null;
  subLabelScore: number | null;
  box: [number, number, number, number] | null;
  zones: string[];
  startTime: number | null;
  endTime: number | null;
  state: ArchiveItemState;
  /** why a `failed` copy failed; null on every other state */
  failureReason: string | null;
  sizeBytes: number | null;
  /**
   * When the *original* stops being held at its source, or null when the server
   * states nothing about it - which means the original is gone. It is the only
   * input to releaseKind(): this GUI knows neither the installation's retention
   * nor the node's clock.
   */
  originExpiresAt: number | null;
  /**
   * Absolute URLs of the archived copy's own media, taken from the payload
   * rather than built here. Empty while the copy is still `pending` - there is
   * nothing to play yet - and on a `failed` one.
   */
  thumbnailUrl: string;
  snapshotUrl: string;
  clipUrl: string;
}

export type ArchiveItemState = 'pending' | 'ready' | 'failed'

/**
 * How full the archive is. The archive is a ring buffer: once `usedBytes`
 * reaches `capacityBytes`, the server makes room for each new entry by
 * dropping the oldest ones, so a full archive is its normal state and not an
 * error. `oldestStartTime` is epoch seconds and null on an empty archive.
 * Either byte figure is null where the server did not send it.
 */
export interface ArchiveUsage {
  capacityBytes: number | null;
  usedBytes: number | null;
  oldestStartTime: number | null;
}

/**
 * What an entry was made from. `event` is the only value the server produces
 * today; `snapshot` and `recording` are the archive view's.
 */
export type ArchiveItemKind = 'event' | 'snapshot' | 'recording' | string

export interface ArchiveItemFilters {
  after?: number | null;
  before?: number | null;
  kind?: string | null;
  /** the detected object class, e.g. `person` - matched exactly by the server */
  label?: string | null;
  /** the matched person's name, likewise matched exactly */
  subLabel?: string | null;
  limit?: number;
}

/**
 * What releasing an archive entry means to the user, and therefore what the
 * control has to say:
 * - `unsave`: the original is still held for a good while, so only the copy
 *   goes and the event itself stays on the events page until its ordinary
 *   retention passes.
 * - `delete`: the original is gone, or goes within the grace period, so
 *   releasing the copy is the end of that event.
 */
export type ReleaseKind = 'unsave' | 'delete'

/**
 * How much of the original's remaining life still counts as "there is time".
 * A wording threshold, not a rule about data: the server stays free to hold the
 * original longer or shorter, and the confirmation names the date it was
 * derived from so a user near the boundary sees the fact rather than only our
 * reading of it.
 */
export const ORIGIN_GRACE_HOURS = 24

/**
 * The long-term archive: the copies of person events that outlive the node's
 * own retention.
 *
 * Checked 2026-09-07 against java-overmind-server's own change `event-archive`
 * - its routes, its `ArchiveItemJson` and its `ArchiveQuery`, i.e. the source
 * that is about to be deployed rather than a running instance. Two things came
 * back different from what this service was first written against, both handled
 * in `lowered()`: `state` and `kind` arrive uppercase, and `kind` is `EVENT`
 * rather than `saved-event`. Everything else held - the three routes, the
 * `{ items: [...] }` envelope, the `{ archiveId }` answer, the 204, absent
 * fields omitted rather than null, `originExpiresAt` omitted when the original
 * is gone *or* the retention is unknown, no media on a `pending` entry, and the
 * exclusive `after`/`before` on `startTime`.
 *
 * Verified 2026-09-23 on a deployed server with a real node behind it: one
 * event saved, shown as saved, found in the archive view, played and deleted
 * again, end to end. A failing index read is still swallowed, so a server
 * without the archive configured leaves the events page as it was.
 *
 *   POST /cameras/{id}/events/{eventId}/archive
 *     -> { archiveId }
 *     Only the id: the copy starts out `pending` and the index is what says
 *     more about it, so the caller marks optimistically and lets the next index
 *     read replace what it wrote.
 *
 *   GET /archive/items?cameraIds=10,11&after=&before=&kind=&label=&subLabel=&limit=
 *     -> { items: [...] }
 *     `after` / `before` bound the item's start time and are assumed to be
 *     exclusive, as the events route's are (design.md, Open Questions).
 *     `label` / `subLabel` are the primer's own filters and are read here as
 *     exact matches; the 2026-09-23 run did not single out whether the
 *     deployed route honours them - unhonoured, they would silently answer an
 *     unfiltered list.
 *
 *   DELETE /archive/items/{archiveId}
 *     -> 204
 *
 *   item: { archiveId, cameraId, cameraName, kind, sourceEventId, label,
 *           subLabel, subLabelScore, box, zones, startTime, endTime, state,
 *           failureReason, sizeBytes, originExpiresAt,
 *           snapshotUrl, thumbnailUrl, clipUrl }
 *     Times are overmind's `LocalDateTime` in UTC in both directions, absent
 *     fields are omitted rather than sent as null, and a refusal carries a
 *     `reason` - the same house shapes the camera routes answer in. `state` and
 *     `kind` arrive uppercase, as every enum on this contract does, and are
 *     lowered here - see lowered(). This change
 *     The save button reads `archiveId`, `sourceEventId`, `state`,
 *     `failureReason`, `originExpiresAt` and the three media URLs. Since
 *     openspec change `kiosk-archive-page` this service has a second caller,
 *     the archive view, which reads the rest of what is normalised here:
 *     `cameraId` and `cameraName` to name the camera an entry was kept from,
 *     `kind` to label and filter it, `subLabel` and `zones` for the tile, and
 *     `startTime` to order and page the list. That is why the whole item was
 *     normalised from the start rather than only the fields the first caller
 *     needed.
 *
 * A service of its own rather than a corner of `frigateService`: the archive is
 * a second media store with its own routes, and the archive view grows this
 * considerably. The URL and envelope helpers below are deliberately duplicated
 * from `frigateService` rather than shared - they are four lines each. The time
 * conversion is the exception: `recordingJobsService` needs the same pair, so it
 * moved into `dateUtils` rather than being copied a third time.
 */
export class ArchiveService {
  private static instanceField: ArchiveService

  protected server = 'uinf'

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new ArchiveService())
    }
    return this.instanceField
  }

  /**
   * Saves one event to the archive and answers the id of the copy. The copy is
   * `pending` at this point: the server has accepted the job, not finished it.
   */
  public async archiveEvent (cameraId: number, eventId: string): Promise<string> {
    const response = await axiosUtils.postToPath(
      this.server, 'eventArchive', { id: cameraId, eventId }, () => ({}))
    return response && response.archiveId
  }

  /**
   * The archive entries for a set of cameras inside a window. The window is the
   * caller's business - the events page asks for what its list spans, so an
   * unbounded filter does not pull the whole archive on every 5s tick.
   */
  public async getItems (cameraIds: number[], filters: ArchiveItemFilters = {}): Promise<ArchiveItem[]> {
    const params = [`cameraIds=${cameraIds.join(',')}`, `limit=${filters.limit || 100}`]
    if (filters.after !== null && filters.after !== undefined) {
      params.push(`after=${this.toLocalDateTime(filters.after)}`)
    }
    if (filters.before !== null && filters.before !== undefined) {
      params.push(`before=${this.toLocalDateTime(filters.before)}`)
    }
    if (filters.kind) {
      params.push(`kind=${encodeURIComponent(filters.kind)}`)
    }
    // The archive view's person filter. Sent only when set, so "every kind" and
    // "everybody" cost no parameter at all and a server that narrows on an
    // empty value cannot mistake one for the other.
    if (filters.label) {
      params.push(`label=${encodeURIComponent(filters.label)}`)
    }
    if (filters.subLabel) {
      params.push(`subLabel=${encodeURIComponent(filters.subLabel)}`)
    }
    const response = await axiosUtils.getResponse(this.server, 'archiveItems', params.join('&'))
    return this.itemsOf(response).map(item => this.toItem(item))
  }

  /**
   * How full the archive is - openspec change `recording-ring-buffer`,
   * design.md D4, a **guessed** contract to be confirmed against
   * java-overmind-server's sibling change:
   *
   *   GET /archive/usage -> { capacityBytes, usedBytes, oldestStartTime? }
   *
   * `oldestStartTime` is omitted on an empty archive. A failure, an
   * unconfigured archive included, is thrown as getItems() throws it: the
   * caller decides what an unreadable fill level means on its page.
   */
  public async usage (): Promise<ArchiveUsage> {
    const response = await axiosUtils.getResponse(this.server, 'archiveUsage')
    const bytes = (value: any) => typeof value === 'number' && !isNaN(value) ? value : null
    return {
      capacityBytes: bytes(response && response.capacityBytes),
      usedBytes: bytes(response && response.usedBytes),
      oldestStartTime: this.toEpochSeconds(response && response.oldestStartTime)
    }
  }

  /**
   * Releases one archive entry. Nothing comes back; a 204 is the whole answer.
   *
   * Since openspec change `event-permanent-delete` this is also the second half
   * of a permanent delete, issued after the source event was removed and
   * without knowing whether the server cascaded into the archive by itself. So
   * a 404 resolves here, for the same reason it does in
   * `frigateService.deleteEvent()`: an entry that is already gone is the state
   * the caller asked for, not a failure to report. A release of an entry
   * somebody else released a moment earlier reads the same way, which is what
   * that user meant too.
   */
  public async deleteItem (archiveId: string): Promise<void> {
    try {
      await axiosUtils.del(this.server, 'archiveItems', archiveId)
    } catch (err) {
      if (err && err.status === 404) {
        return
      }
      throw err
    }
  }

  /**
   * What releasing this entry means, read from `originExpiresAt` and nothing
   * else - the GUI knows neither the installation's retention nor the node's
   * clock, so a locally derived answer would be a guess dressed as a fact.
   */
  public releaseKind (item: ArchiveItem | null): ReleaseKind {
    if (!item || item.originExpiresAt === null) {
      return 'delete'
    }
    const hoursLeft = (item.originExpiresAt - Date.now() / 1000) / 3600
    return hoursLeft > ORIGIN_GRACE_HOURS ? 'unsave' : 'delete'
  }

  private toItem (item: any): ArchiveItem {
    return {
      archiveId: item.archiveId,
      cameraId: item.cameraId,
      cameraName: item.cameraName || null,
      kind: this.lowered(item.kind) || 'event',
      sourceEventId: item.sourceEventId || null,
      label: item.label || null,
      subLabel: item.subLabel || null,
      // absent, never 0, on an item that names nobody
      subLabelScore: item.subLabelScore === undefined ? null : item.subLabelScore,
      box: item.box || null,
      // always a list on the wire; defaulted anyway so a reader never has to ask
      zones: item.zones || [],
      startTime: this.toEpochSeconds(item.startTime),
      endTime: this.toEpochSeconds(item.endTime),
      state: this.lowered(item.state) || 'ready',
      failureReason: item.failureReason || null,
      sizeBytes: item.sizeBytes === undefined ? null : item.sizeBytes,
      // omitted, rather than null, for an item whose original is gone - which
      // releaseKind() reads as exactly that
      originExpiresAt: this.toEpochSeconds(item.originExpiresAt),
      thumbnailUrl: this.absoluteUrl(item.thumbnailUrl),
      snapshotUrl: this.absoluteUrl(item.snapshotUrl),
      clipUrl: this.absoluteUrl(item.clipUrl)
    }
  }

  /**
   * The server's enums are uppercase (`READY`, `EVENT`) while everything that
   * reads them here compares lowercase, so they are lowered once at this seam -
   * the same thing `camerasService` does with `OK` and `PROVISIONED`, and for
   * the same reason: one place that knows, and no reader that has to remember.
   *
   * `kind` is `EVENT` rather than the `saved-event` this service was first
   * written against; the server's enum is the contract, and nothing in this
   * change reads the value.
   */
  private lowered (value: any): any {
    return typeof value === 'string' ? value.toLowerCase() : null
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
   * Epoch seconds out of overmind's UTC `LocalDateTime`. The pair lives in
   * dateUtils since openspec change `camera-recording-jobs` gave it a second
   * caller.
   */
  private toEpochSeconds (value: any): number | null {
    return dateUtils.utcLocalDateTimeToEpochSeconds(value)
  }

  /** The inverse, for `after` and `before`: `2026-09-01T19:54:23.224`. */
  private toLocalDateTime (epochSeconds: number): string {
    return dateUtils.epochSecondsToUtcLocalDateTime(epochSeconds)
  }

  /** Overmind's item envelope, tolerating a bare array. */
  private itemsOf (response: any): any[] {
    if (Array.isArray(response)) {
      return response
    }
    return (response && response.items) || []
  }
}

export const singleton = ArchiveService.getInstance()
