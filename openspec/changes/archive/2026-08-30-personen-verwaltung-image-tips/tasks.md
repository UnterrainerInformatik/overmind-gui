## 1. Info dialog

- [x] 1.1 Add an `info_outline` icon button next to the "Neue Person
      anlegen" heading in `KioskPersonenVerwaltung.vue` that opens a
      `v-dialog` with tips on choosing reference images (mix of
      frontal/angled/lighting, why variation helps for CompreFace
      embeddings), phrased neutrally rather than addressed at any
      specific person's cameras.
- [x] 1.2 Add `imageTipsTitle`, `imageTipsText`, `imageTipsClose` strings
      to `src/locales/de-AT.json` and `src/locales/en-US.json`.

## 2. Verification

- [x] 2.1 Manually verify in the browser: the info button opens the
      dialog, the text renders with both paragraphs, and closing the
      dialog works.
