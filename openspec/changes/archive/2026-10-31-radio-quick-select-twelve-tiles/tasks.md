## 1. Station cap

- [x] 1.1 Replace `.slice(0, 8)` in `audioService.getRadio` (`src/utils/webservices/audioService.ts`) with a `RADIO_STATIONS = 12` constant; verify with a 13-station mock that the popup shows exactly the first 12
- [x] 1.2 Grep `src` for any other station cap or "eight"/"8" tied to radio (store, mixins, i18n texts) and verify none remains

## 2. Dialog layout

- [x] 2.1 Update the doc comment in `AudioRadioDialog.vue` to "up to twelve" and reference this change; verify by reading the file
- [x] 2.2 Add an `xsOnly` modifier class on the grid that lowers the column minimum to `100px` (three columns at ~390 px); verify in the browser at 390 px that twelve stations show as 4 rows of 3
- [x] 2.3 Check the popup at 1280×600 and 1280×500: twelve tiles in 3 rows of 4, the card text area does not scroll; tighten tile min-height, image size or gap only if it does, and verify again

## 3. Verification

- [x] 3.1 Grow the radio mock in `~/.local/share/overmind-gui-verify/mocks/audio.mjs` to 13 stations and update `suites/kiosk-audio-bar.mjs`: 12 tiles in server order (13th absent), no scroll in the radio card text at 1280×600 and 1280×500, existing play / empty / phone-width checks still green; verify the suite passes
- [x] 3.2 Run `npm run lint` and the production build (`npm run build`) and verify both succeed
