## 1. Wording

- [x] 1.1 Add `filterCamera` and `allCameras` under `page.kiosk.personenEvents`
  in `src/locales/de-AT.json`, with the strings the archive's keys already carry
  ("Kamera", "Alle Kameras")
- [x] 1.2 Add the same two keys under `page.kiosk.personenEvents` in
  `src/locales/en-US.json` ("Camera", "All cameras")

## 2. Filter state in KioskPersonenEvents.vue

- [x] 2.1 Add a `cameraFilter: null` data property, beside `nameFilter`, with a
  comment saying null means every configured camera
- [x] 2.2 Add a `cameraItems` computed: the "all cameras" entry at `value: null`
  first, then one `{ value: camera.id, text: camera.displayName }` per configured
  camera, in registry order
- [x] 2.3 Add a `cameraFilter` watcher calling `loadEvents(true)`, alongside the
  existing filter watchers
- [x] 2.4 Add a `filteredCameraIds()` method returning the selected id alone, or
  every configured camera's id when nothing is selected

## 3. Scoping what is read

- [x] 3.1 Build `ids` in `fetchPage()` from `filteredCameraIds()` instead of
  `this.cameras` — this is what makes paging, `hasMore`, `unreachableCameras`
  and `allFailed` describe the filtered list (design.md — Decisions)
- [x] 3.2 Read the archive index in `loadArchive()` for the same ids, so the
  saved markers cover exactly the events listed
- [x] 3.3 Confirm no other caller builds a camera-id list: `refreshEvents()` and
  `loadEvents()` both go through `fetchPage()`, and the `!this.cameras.length`
  guards stay on the configured set (the page's no-camera state), not on the
  selection

## 4. The control

- [x] 4.1 Add the `v-select` as the first control in the `events-filters` row,
  bound to `cameraFilter` with `:items="cameraItems"`, labelled
  `page.kiosk.personenEvents.filterCamera`, `dense outlined hide-details="auto"`
  and `v-if="cameras.length > 1"`, classed `events-filter-camera mr-4 mb-2`
- [x] 4.2 Give `.events-filter-camera` the same `max-width: 220px` as
  `.events-filter-name` in the page's style block
- [x] 4.3 Leave the tiles' `:camera-name` and the dialog's `detailSubtitle` keyed
  on `cameras.length > 1` — the name stays visible under a selection

## 5. Verification in the running app

- [x] 5.1 With more than one camera flagged for the events page: the filter is
  offered, set to "all cameras", and the list is unchanged from before
- [x] 5.2 Select one camera: only its events remain, and "load more" keeps
  returning that camera's older events rather than near-empty pages
- [x] 5.3 Leave the page open under a selection and let an event complete on
  another camera: it does not appear; switching back to "all cameras" brings it in
- [x] 5.4 Flag a single camera for the events page: no filter is offered and the
  list behaves as today
- [x] 5.5 Under a selection, a saved event still shows its archive marker and its
  dialog still offers save/release
- [x] 5.6 Lint and build (run by the user)
