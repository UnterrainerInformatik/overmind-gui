## Why

The person management page lets users pick reference images for face
recognition, but gives no guidance on what makes a good set of images.
Poorly chosen reference images (too few, too similar to each other) lead
to worse face-match results in CompreFace/Double Take.

## What Changes

- Add an info button next to the "Neue Person anlegen" / "Create new
  person" heading on the management page (`KioskPersonenVerwaltung.vue`)
  that opens a dialog with general tips on choosing reference images:
  a suggested mix of frontal/angled/lighting variety plus a short note on
  why variation helps (CompreFace stores multiple embeddings per person,
  not a single averaged face).
- No behavior change to person/image CRUD; this is informational only.

## Capabilities

### Modified Capabilities
- None. This is a minor UI/copy addition to the existing
  `kiosk-personen-management-page` capability and does not change any of
  its documented requirements or scenarios.

## Impact

- Affected views: `src/views/KioskPersonenVerwaltung.vue` (info button +
  dialog).
- Affected locales: `src/locales/de-AT.json`, `src/locales/en-US.json`
  (new `imageTipsTitle`/`imageTipsText`/`imageTipsClose` strings).
