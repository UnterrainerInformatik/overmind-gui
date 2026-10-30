import Vue from 'vue'
import { SseClient } from '@/utils/sseClient'
import { singleton as audioService, AudioState } from '@/utils/webservices/audioService'

/**
 * The house audio state, shared by every component that shows it (the kiosk
 * audio bar now, the floor-plan buttons later), so there is one SSE listener
 * and one poll loop however many of them are mounted (openspec change
 * `kiosk-audio-bar`, design D1).
 *
 * The `audio-state` SSE event is the primary source and always carries the
 * full state, which replaces the old one. `GET /audio/state` fills in on first
 * use, on every SSE (re)connect, when the display wakes up and every 30 s as a
 * safety net. Background loads never show an error: until the audio backend
 * answers, `available` simply stays false.
 */
export interface AudioStateStore {
  state: AudioState | null;
  /** true from the first valid state on; false only while none ever arrived */
  available: boolean;
}

const POLL_INTERVAL_MS = 30000

export const audioStore: AudioStateStore = Vue.observable({
  state: null,
  available: false
})

let consumers = 0
let pollTimer: ReturnType<typeof setInterval> | null = null

function accept (raw: unknown): void {
  const state = audioService.normalizeState(raw)
  if (state === null) {
    return
  }
  audioStore.state = state
  audioStore.available = true
}

async function reload (): Promise<void> {
  try {
    accept(await audioService.getState())
  } catch (err) {
    // A failed poll after a good state keeps that state - the SSE stream is
    // the primary source - so only a store that never had one stays unavailable.
  }
}

const onAudioState = (payload: unknown): void => {
  accept(payload)
}

const onConnected = (): void => {
  reload()
}

const onWake = (): void => {
  if (!document.hidden) {
    reload()
  }
}

/** Start sharing the state. Pair every call with one `release()`. */
export function acquire (): AudioStateStore {
  consumers++
  if (consumers === 1) {
    const sse = SseClient.getInstance()
    sse.addEventListener('audio-state', onAudioState)
    sse.addEventListener('connected', onConnected)
    document.addEventListener('visibilitychange', onWake)
    pollTimer = setInterval(reload, POLL_INTERVAL_MS)
    reload()
  }
  return audioStore
}

export function release (): void {
  if (consumers === 0) {
    return
  }
  consumers--
  if (consumers === 0) {
    const sse = SseClient.getInstance()
    sse.removeEventListener('audio-state', onAudioState)
    sse.removeEventListener('connected', onConnected)
    document.removeEventListener('visibilitychange', onWake)
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }
}
