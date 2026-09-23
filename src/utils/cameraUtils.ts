import { Camera, StreamRole } from '@/utils/webservices/interfaces/Camera'
import { CameraNode } from '@/utils/webservices/interfaces/CameraNode'

/**
 * Below this many hours of recording left on the disk, the headroom is red.
 * It is where Frigate's own emergency cleanup takes over and starts deleting
 * the oldest recordings whatever retention was set - so red means "the
 * retention you set no longer holds" (openspec change `recording-ring-buffer`,
 * design.md D3).
 */
export const HEADROOM_RED_HOURS = 1

/** Below this many hours the headroom is yellow: at least a working day to react. */
export const HEADROOM_YELLOW_HOURS = 24

/** A storage reading older than this many hours is said to be possibly out of date. */
export const STORAGE_STALE_HOURS = 1

/**
 * The figures the recording-storage gauge reads. A node carries all of them;
 * the archive passes its capacity as `recordingRingBytes` and its use as
 * `recordingsBytes` and leaves the rest out, because it is a ring without a
 * disk underneath that this GUI can see.
 */
export type StorageFigures = Partial<Pick<CameraNode,
  'storageTotalBytes' | 'storageUsedBytes' | 'recordingRingBytes' | 'recordingsBytes' | 'recordingRateBytesPerHour'>>

/**
 * What a camera records per day when its recording stream reports no bitrate:
 * a **rule of thumb** for a typical 1080p/4MP camera recording continuously,
 * not a measured figure. Every caller that falls back to it says so on screen.
 */
export const RULE_OF_THUMB_GB_PER_DAY = 30

/** A footage volume estimate, and whether it rests on the rule of thumb. */
export interface VolumeEstimate {
  bytes: number;
  ruleOfThumb: boolean;
}

/** How the disk headroom is coloured: a Vuetify theme name, or neutral. */
export type HeadroomColour = 'error' | 'warning' | 'neutral'

const known = (value: number | null | undefined): value is number =>
  typeof value === 'number' && !isNaN(value)

/**
 * The camera facts that both the Kameras page and the node detail dialog put on
 * screen, kept in one place so the two never drift apart. Everything here is
 * translation-free on purpose - the caller owns the wording, this owns the
 * decision of what to say.
 */
export class CameraUtils {
  private static instanceField: CameraUtils

  public static getInstance () {
    if (!this.instanceField) {
      this.instanceField || (this.instanceField = new CameraUtils())
    }
    return this.instanceField
  }

  /**
   * Which stream serves which purpose. A camera whose three purposes all sit on
   * the same stream is collapsed to that one name: naming the same stream three
   * times says nothing, and the single-stream camera is the common case.
   */
  public assignment (camera: Camera): { single: string | null; roles: Record<StreamRole, string> } {
    const roles = camera.roles || ({} as Record<StreamRole, string>)
    const distinct = [roles.live, roles.detect, roles.record].filter((name, index, all) => name && all.indexOf(name) === index)
    return { single: distinct.length === 1 ? distinct[0] : null, roles }
  }

  /*
   * The ring buffer arithmetic of design.md D3. Every one answers null where an
   * input it needs is unknown, so nothing derived from an unknown can reach the
   * screen as a number - "the node never said" must not read as a 0.
   */

  /** Free space on the disk under the recordings, in bytes. */
  public diskFree (figures: StorageFigures): number | null {
    return known(figures.storageTotalBytes) && known(figures.storageUsedBytes)
      ? Math.max(0, figures.storageTotalBytes - figures.storageUsedBytes)
      : null
  }

  /**
   * The part of the ring not yet filled, in bytes: 0 once it is full, and
   * Infinity without a ring at all, since nothing then stops the recordings
   * from growing until the disk does.
   */
  public ringFree (figures: StorageFigures): number | null {
    if (!known(figures.recordingRingBytes)) {
      return Infinity
    }
    return known(figures.recordingsBytes)
      ? Math.max(0, figures.recordingRingBytes - figures.recordingsBytes)
      : null
  }

  /**
   * How full the ring is, as a proportion - unclamped, so a ring that
   * overshot between two enforcement runs reads above 1. Null without a ring:
   * there is nothing to be a proportion of.
   */
  public ringFill (figures: StorageFigures): number | null {
    return known(figures.recordingRingBytes) && figures.recordingRingBytes > 0 && known(figures.recordingsBytes)
      ? figures.recordingsBytes / figures.recordingRingBytes
      : null
  }

  /**
   * How many hours of recording the free disk space holds at the current
   * rate. Null at a rate of 0 as well as at an unknown one: nothing is being
   * recorded, so the question has no answer, and the caller says which of the
   * two it is.
   */
  public headroomHours (figures: StorageFigures): number | null {
    const free = this.diskFree(figures)
    const rate = figures.recordingRateBytesPerHour
    return free !== null && known(rate) && rate > 0 ? free / rate : null
  }

  /** How many days of footage the whole ring holds at the current rate. */
  public ringDays (figures: StorageFigures): number | null {
    const rate = figures.recordingRateBytesPerHour
    return known(figures.recordingRingBytes) && known(rate) && rate > 0
      ? figures.recordingRingBytes / (rate * 24)
      : null
  }

  /**
   * Whether the disk would run out before the ring is full - the only case in
   * which the headroom is a danger at all. While the ring fills first, its own
   * eviction keeps the recordings from growing and a small headroom is no
   * threat. With a ring, this is also exactly "the ring is larger than this
   * disk can hold": ring > recordings + free is free < ring - recordings.
   */
  public dangerApplies (figures: StorageFigures): boolean | null {
    const free = this.diskFree(figures)
    const ringFree = this.ringFree(figures)
    return free === null || ringFree === null ? null : free < ringFree
  }

  /**
   * The headroom's colour: red below HEADROOM_RED_HOURS, yellow below
   * HEADROOM_YELLOW_HOURS, and neutral otherwise or whenever no danger
   * applies. Null - no colour at all - where the hours or the danger are
   * unknown, including at a rate of 0.
   */
  public headroomColour (figures: StorageFigures): HeadroomColour | null {
    const hours = this.headroomHours(figures)
    const danger = this.dangerApplies(figures)
    if (hours === null || danger === null) {
      return null
    }
    if (!danger) {
      return 'neutral'
    }
    if (hours < HEADROOM_RED_HOURS) {
      return 'error'
    }
    return hours < HEADROOM_YELLOW_HOURS ? 'warning' : 'neutral'
  }

  /**
   * How old a storage reading is, in hours, from overmind's UTC
   * `LocalDateTime`. Null for a reading without a time.
   */
  public readingAgeHours (reportedAt: string | null | undefined, now: number = Date.now()): number | null {
    if (!reportedAt) {
      return null
    }
    const ms = Date.parse(/Z$|[+-]\d\d:\d\d$/.test(reportedAt) ? reportedAt : `${reportedAt}Z`)
    return Number.isFinite(ms) ? Math.max(0, (now - ms) / 3600000) : null
  }

  /** Whether a reading is old enough to be said to be possibly out of date. */
  public isStale (reportedAt: string | null | undefined, now: number = Date.now()): boolean {
    const age = this.readingAgeHours(reportedAt, now)
    return age !== null && age > STORAGE_STALE_HOURS
  }

  /**
   * How much footage continuous recording produces over `hours`: the recording
   * stream's bitrate times the duration where the bitrate is known, otherwise
   * RULE_OF_THUMB_GB_PER_DAY per day (openspec change `camera-recording-jobs`,
   * design.md D6). Shared by the recording job form and the stream settings'
   * per-day figure, so the two cannot drift apart.
   */
  public recordingVolumeBytes (bitrateKbps: number | null | undefined, hours: number): VolumeEstimate {
    const seconds = Math.max(0, hours) * 3600
    if (known(bitrateKbps) && bitrateKbps > 0) {
      // kbit as 1024 bits, the reading the stream settings' estimate always had
      return { bytes: (bitrateKbps * 1024 / 8) * seconds, ruleOfThumb: false }
    }
    return { bytes: RULE_OF_THUMB_GB_PER_DAY * 1024 * 1024 * 1024 * (seconds / 86400), ruleOfThumb: true }
  }

  /**
   * The bitrate the camera's recording stream reports - `roles.record` looked
   * up in `streams` - or null where it reports none.
   */
  public recordBitrateKbps (camera: Camera | null | undefined): number | null {
    if (!camera || !camera.roles || !camera.streams) {
      return null
    }
    const stream = camera.streams.find(candidate => candidate.name === camera.roles.record)
    return stream && known(stream.bitrateKbps) ? stream.bitrateKbps : null
  }

  /**
   * A volume as a person reads it: whole GB, or one decimal below 10 GB, where
   * the difference between 1.4 and 1 still matters.
   */
  public volumeGigabytes (bytes: number): number {
    const gb = bytes / 1024 / 1024 / 1024
    return gb < 10 ? Math.round(gb * 10) / 10 : Math.round(gb)
  }

  /** A byte figure as GB with one decimal; null stays null so it can be shown as unknown. */
  public gigabytes (bytes: number | null): number | null {
    return bytes === null || bytes === undefined ? null : Math.round((bytes / 1024 / 1024 / 1024) * 10) / 10
  }
}

export const singleton = CameraUtils.getInstance()
