import { singleton as frigateService } from '@/utils/webservices/frigateService'
import { singleton as archiveService } from '@/utils/webservices/archiveService'

export interface RecordingDeletionTarget {
  /** the camera the original event was reported by, or null where there is none */
  cameraId?: number | null;
  /** the event at its source, or null for a recording that only lives in the archive */
  eventId?: string | null;
  /** the archived copy, or null where none was ever made */
  archiveId?: string | null;
}

export interface RecordingDeletionOutcome {
  /** nothing of the original is left at its source */
  originGone: boolean;
  /** nothing of the archived copy is left */
  copyGone: boolean;
  /** whether there was a copy at all - what makes a half-finished deletion reportable */
  hadCopy: boolean;
  /** the server's own sentence for whichever half refused, or '' */
  reason: string;
}

/**
 * Deletes one recording everywhere it is kept: the original at its source
 * first, then the archived copy where one is named.
 *
 * Source first, because it is the one that keeps producing a playable recording
 * while it exists - the copy is the one a user could still get rid of by hand
 * through the events page's release control.
 *
 * The second call is not skipped on the assumption that the server cascaded: a
 * DELETE on an entry that is already gone answers 404, which both services
 * count as success, so the redundant request costs one round trip while
 * skipping it would cost a copy left behind. For the same reason the archive
 * view calls this with the source event whenever its entry names one, even when
 * `originExpiresAt` says the original is long gone.
 *
 * A place that was never there counts as cleared, so the two flags say "nothing
 * of the recording is left here" rather than "a request succeeded" - but only a
 * place that really existed can be *reported* as one half of a half-finished
 * deletion, which is what `hadCopy` is for.
 *
 * What the outcome means for the list and for the user is the caller's: the
 * events page removes the event when the original went, the archive page
 * removes the entry when the copy went, and the two word their snackbars
 * differently because they are looking at different things.
 */
export async function deleteRecording (
  { cameraId = null, eventId = null, archiveId = null }: RecordingDeletionTarget
): Promise<RecordingDeletionOutcome> {
  const hasOrigin = cameraId !== null && cameraId !== undefined && !!eventId
  const hadCopy = !!archiveId
  let originGone = !hasOrigin
  let copyGone = !hadCopy
  let originReason = ''
  let copyReason = ''
  if (hasOrigin) {
    try {
      await frigateService.deleteEvent(cameraId as number, eventId as string)
      originGone = true
    } catch (err) {
      originReason = (err && err.serverMessage) || ''
    }
  }
  if (hadCopy) {
    try {
      await archiveService.deleteItem(archiveId as string)
      copyGone = true
    } catch (err) {
      copyReason = (err && err.serverMessage) || ''
    }
  }
  return { originGone, copyGone, hadCopy, reason: originReason || copyReason }
}
