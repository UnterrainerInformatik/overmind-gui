import Vue from 'vue'

/**
 * The device's shuffle choice for playing a playlist, shared by the playlist
 * editor and the queue popup so both play the same way (openspec change
 * `kiosk-playlist-editor-extras`, design D2). Off on a device that never
 * changed it; remembered in this browser only. When storage is blocked the
 * choice still works for the current page session.
 */
const STORAGE_KEY = 'kioskAudioShuffle'

export interface AudioShuffleStore {
  on: boolean;
}

function readStored (): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export const audioShuffle: AudioShuffleStore = Vue.observable({
  on: readStored()
})

export function setShuffle (on: boolean): void {
  audioShuffle.on = on
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  } catch {
    // ignore - the choice then lasts for this page session only
  }
}
