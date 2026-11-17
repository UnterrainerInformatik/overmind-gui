/**
 * Colours of the kiosk volume sliders (stream cards, balance panel, the audio
 * bar's volume menu). A fixed per-theme accent so the slider stands out from
 * its card: the theme's primary is nearly the card's own tone in the dark
 * theme (changes `audio-card-volume-contrast`, D1, and
 * `kiosk-overview-room-for-audio-bar`, D4).
 *
 * @param {boolean} dark whether the dark theme is active
 * @returns {{ color: string, trackColor: string }}
 */
export function volumeSliderColors (dark) {
  return dark
    ? { color: '#4FC3F7', trackColor: 'rgba(255,255,255,0.35)' }
    : { color: '#1976D2', trackColor: 'rgba(0,0,0,0.3)' }
}
