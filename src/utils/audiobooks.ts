import type { AudioAudiobookLibrary, AudioChapter } from '@/utils/webservices/audioService'

/*
 * Pure helpers for audiobooks and podcast episodes (openspec change
 * `kiosk-audiobooks`, designs D2-D5). The project has no unit test setup, so
 * they are checked in the browser test.
 */

export type AudioItemKind = 'audiobook' | 'episode'

const AUDIOBOOK_PREFIX = 'library://audiobook/'
// any provider: episode uris are opaque provider strings (`filesystem_local--x://podcast_episode/...`)
const AUDIOBOOK_PATTERN = /^[^:/]+:\/\/audiobook\//
const EPISODE_PATTERN = /^[^:/]+:\/\/podcast_episode\//

/** How far into a chapter "previous" goes back to its start instead of the previous chapter (D3). */
export const CHAPTER_RESTART_SECONDS = 3

/** Skip step for audiobooks and episodes, instead of the bar's 10 s. */
export const AUDIOBOOK_SKIP_SECONDS = 30

/** How long after an action the lists and details are reloaded, so MA has written its play log (D6). */
export const RELOAD_DELAY_MS = 1500

/** At most this many entries in the "Weiterhören" row (D4). */
export const CONTINUE_LIMIT = 12

/**
 * Placeholder cover colours (D5): Material 700/800 shades, dark enough for
 * white text in both themes, neighbours apart in hue.
 */
export const PLACEHOLDER_PALETTE = [
  '#C62828', '#1565C0', '#2E7D32', '#6A1B9A',
  '#00695C', '#AD1457', '#4E342E', '#283593'
]

/** The kind of the item a track URI names, or null for anything else. */
export function itemKindOf (uri: string | null | undefined): AudioItemKind | null {
  if (typeof uri !== 'string') {
    return null
  }
  if (AUDIOBOOK_PATTERN.test(uri)) {
    return 'audiobook'
  }
  return EPISODE_PATTERN.test(uri) ? 'episode' : null
}

/** The audiobook id of a `library://audiobook/<id>` URI (the one `getAudiobook` takes), or null. */
export function audiobookIdOf (uri: string | null | undefined): string | null {
  if (typeof uri !== 'string' || !uri.startsWith(AUDIOBOOK_PREFIX)) {
    return null
  }
  const id = (uri as string).slice(AUDIOBOOK_PREFIX.length)
  return id !== '' ? id : null
}

/**
 * Where chapter `index` ends: its `end`, else the next chapter's start, else
 * the book's duration (a missing `end` is usually on the last chapter).
 */
export function chapterEndOf (chapters: AudioChapter[], index: number, duration: number | null): number {
  const chapter = chapters[index]
  if (chapter.end !== null && chapter.end > chapter.start) {
    return chapter.end
  }
  const next = chapters[index + 1]
  if (next) {
    return next.start
  }
  return duration !== null && duration > chapter.start ? duration : chapter.start
}

/**
 * The index of the chapter `position` lies in: the last one whose start is at
 * or before it (0 before the first start), -1 without chapters.
 */
export function chapterIndexAt (chapters: AudioChapter[], position: number): number {
  if (chapters.length === 0) {
    return -1
  }
  let index = 0
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].start <= position) {
      index = i
    } else {
      break
    }
  }
  return index
}

/** The seek target of "previous" in chapter mode (D3). */
export function previousChapterTarget (chapters: AudioChapter[], position: number): number {
  const index = chapterIndexAt(chapters, position)
  if (index < 0) {
    return 0
  }
  if (position - chapters[index].start > CHAPTER_RESTART_SECONDS) {
    return chapters[index].start
  }
  return index > 0 ? chapters[index - 1].start : 0
}

/** The seek target of "next" in chapter mode, or null on the last chapter (D3). */
export function nextChapterTarget (chapters: AudioChapter[], position: number): number | null {
  const index = chapterIndexAt(chapters, position)
  return index >= 0 && index < chapters.length - 1 ? chapters[index + 1].start : null
}

interface Progressing {
  resumePosition: number;
  fullyPlayed: boolean;
  recentRank: number | null;
}

/** True for a started, not fully played entry. */
export function isInProgress (item: Progressing): boolean {
  return item.resumePosition > 0 && !item.fullyPlayed
}

/**
 * The "Weiterhören" row: started and not finished, most recently played first
 * (`recentRank` ascending, unranked last), at most CONTINUE_LIMIT (D4).
 */
export function continueEntries<T extends Progressing> (items: T[]): T[] {
  const rank = (i: T) => i.recentRank !== null ? i.recentRank : Number.MAX_SAFE_INTEGER
  return items
    .filter(isInProgress)
    .slice()
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, CONTINUE_LIMIT)
}

const collator = typeof Intl !== 'undefined' ? new Intl.Collator('de', { sensitivity: 'base', numeric: true }) : null

function compareText (a: string, b: string): number {
  return collator ? collator.compare(a, b) : a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0
}

interface Named {
  name: string;
  authors?: string[];
}

/**
 * The grid order (D4): books by first author, then name; podcasts by name.
 * Kids' books carry the series as author and the episode number in front of
 * the name ("001 Im Tal der Dinosaurier"), so this keeps each series together
 * and in episode order.
 */
export function sortForGrid<T extends Named> (items: T[], library: AudioAudiobookLibrary | 'podcasts'): T[] {
  const byAuthor = library !== 'podcasts'
  return items.slice().sort((a, b) => {
    if (byAuthor) {
      const authorA = a.authors && a.authors.length > 0 ? a.authors[0] : ''
      const authorB = b.authors && b.authors.length > 0 ? b.authors[0] : ''
      // books without author last
      if (authorA === '' && authorB !== '') {
        return 1
      }
      if (authorB === '' && authorA !== '') {
        return -1
      }
      const c = compareText(authorA, authorB)
      if (c !== 0) {
        return c
      }
    }
    return compareText(a.name, b.name)
  })
}

/** The filter match (D4): name or any author contains the text, ignoring case. */
export function matchesFilter (item: Named, filter: string | null | undefined): boolean {
  const text = (filter || '').trim().toLowerCase()
  if (text === '') {
    return true
  }
  if (item.name.toLowerCase().includes(text)) {
    return true
  }
  return !!item.authors && item.authors.some(a => a.toLowerCase().includes(text))
}

/** The placeholder colour of a name (D5): always the same for the same name. */
export function placeholderColor (name: string): string {
  let n = 0
  for (const c of `${name}`) {
    n = (n * 31 + c.charCodeAt(0)) | 0
  }
  const len = PLACEHOLDER_PALETTE.length
  return PLACEHOLDER_PALETTE[((n % len) + len) % len]
}

/** 0..1, how far an entry is played; 1 when fully played, 0 without a duration. */
export function progressOf (item: { resumePosition: number; fullyPlayed: boolean; duration: number | null }): number {
  if (item.fullyPlayed) {
    return 1
  }
  if (!item.duration || item.duration <= 0) {
    return 0
  }
  return Math.max(0, Math.min(1, item.resumePosition / item.duration))
}

/** `m:ss` or `h:mm:ss`. */
export function clockText (seconds: number | null): string {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = `${s % 60}`.padStart(2, '0')
  return h > 0 ? `${h}:${`${m}`.padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** `5 h 12 min` or `42 min`; for total durations. */
export function durationText (seconds: number | null): string {
  const s = Math.max(0, Math.round(seconds || 0))
  const minutes = Math.round(s / 60)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) {
    return `${Math.max(m, s > 0 ? 1 : 0)} min`
  }
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

/**
 * Up to two initials for a small placeholder thumbnail (change
 * `kiosk-audiobooks-list`, D4): the first letter or digit of the first two
 * words, uppercased; "?" when the name has none.
 */
export function initialsOf (name: string | null | undefined): string {
  const initials = `${name || ''}`
    .split(/\s+/)
    .map(word => {
      const match = word.match(/[\p{L}\p{N}]/u)
      return match ? match[0] : ''
    })
    .filter(c => c !== '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return initials !== '' ? initials : '?'
}
