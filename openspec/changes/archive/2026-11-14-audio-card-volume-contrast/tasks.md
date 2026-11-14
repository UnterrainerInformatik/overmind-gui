## 1. Slider colour

- [x] 1.1 In `AudioStreamCard.vue` add computed `volumeColor` / `volumeTrackColor` from `$vuetify.theme.dark` (D1) and bind them as `color` / `track-color` on the volume `v-slider`
- [x] 1.2 `npm run lint` and `npm run build` pass

## 2. Verification

- [x] 2.1 In the browser (claude-in-chrome or headless Puppeteer), open the kiosk audio plan popup in the dark theme and check filled track, thumb and unfilled track are clearly visible; measure the contrast of the thumb colour against the card's computed background (≥ 3:1)
- [x] 2.2 Same check in the light theme
- [x] 2.3 Check main group and solo room cards use the same slider colour, and dragging still moves the slider (read-only check: do not release a changed level on the live server, or restore it right after)
