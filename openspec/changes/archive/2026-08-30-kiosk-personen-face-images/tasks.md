## 1. Double Take API groundwork

- [x] 1.1 Confirm Double Take's admin API base URL and auth requirements
      against the running instance (see design.md - Open Questions).
      Confirmed: `https://doubletake.unterrainer.info`, v1.13.11.8,
      `auth: false` (no token needed).
- [x] 1.2 Confirm the exact endpoints/payloads for: list people, create
      person, delete person, list a person's reference images, upload a
      reference image, delete a reference image. Confirmed against the
      running instance and `jakowenko/double-take` server source (see
      design.md - Decisions): people are name-keyed (no id, no
      empty-person creation); `GET /api/train/status` lists people;
      `GET /api/train?name=` lists a person's images; creating a person
      and uploading images both go through
      `POST /api/train/add/:name` (multipart `files[]`); removing an
      image or a person needs both `DELETE /api/train/remove/:name` and
      `DELETE /api/storage/train`.

## 2. Double Take service client

- [x] 2.1 Add `src/utils/webservices/doubleTakeService.ts` following the
      `frigateService.ts` convention (kept outside `BaseService`/`rest.ts`)
- [x] 2.2 Implement `getPeople()`
- [x] 2.3 Implement `createPerson(name, files)` — name plus at least one
      reference image in one call, per the merged create+upload flow
      (see design.md - Decisions, spec's "Create a person" requirement)
- [x] 2.4 Implement `deletePerson(name)`
- [x] 2.5 Implement `getReferenceImages(name)`
- [x] 2.6 Implement `uploadReferenceImages(name, files)`
- [x] 2.7 Implement `deleteReferenceImage(name, image)`

## 3. Shared UI pieces

- [x] 3.1 Add a small reusable confirmation-dialog component (Vuetify
      `v-dialog`-based) for gating delete/remove actions

## 4. Management page

- [x] 4.1 Create the management page view (e.g.
      `src/views/KioskPersonenVerwaltung.vue`), following the `Kiosk*`
      view conventions
- [x] 4.2 Add its router entry in `src/router/index.ts`, reachable only by
      direct link (no `KioskOverview` tile), per the `KioskMigrations`
      pattern — no `kioskMode(true)` call on mount
- [x] 4.3 Load and display the list of known people on mount; show an
      empty state when there are none and an error state if loading fails
- [x] 4.4 Add "create person" UI (name input + `v-file-input`, at least
      one image required), wired to `doubleTakeService.createPerson`,
      with error handling that leaves the list unchanged on failure
- [x] 4.5 Add person selection that loads and displays the selected
      person's reference images, with an empty state when there are none
- [x] 4.6 Add image upload UI (`v-file-input`) for the selected person,
      wired to `doubleTakeService.uploadReferenceImages`, with error
      handling that leaves existing images unchanged on failure
- [x] 4.7 Add a remove control per reference image, gated by the
      confirmation dialog, wired to
      `doubleTakeService.deleteReferenceImage`
- [x] 4.8 Add a delete control per person, gated by the confirmation
      dialog, wired to `doubleTakeService.deletePerson`, removing the
      person and their reference images from view on success
- [x] 4.9 Add a back link returning to `KioskPersonen`

## 5. KioskPersonen entry point

- [x] 5.1 Add a "Personen" `KioskLinkPanel` button below the existing back
      button on `src/views/KioskPersonen.vue`, matching the back button's
      width, routed to the new management page

## 6. Verification

- [x] 6.1 Manually verify in the browser: create a person, upload a
      reference image, remove a reference image, delete a person, and
      both confirmation-dialog cancel paths. Verified live against the
      running Double Take instance with a throwaway test person
      (`clitest_deleteme`), fully cleaned up afterwards — the 7 real
      people were unaffected throughout. This run surfaced and fixed two
      real bugs (see design.md - Decisions): creating a genuinely new
      person crashed the Double Take server until `addTrainingImages`
      started pre-creating the training folder via
      `POST /api/filesystem/folders/:name`; and a GET fired immediately
      after an upload could transiently 500, fixed with a bounded retry.
- [x] 6.2 Manually verify the new button's width matches the back
      button's at different viewport sizes, consistent with the existing
      `kiosk-personen-page` back-link layout requirement. Both buttons
      are the same `KioskLinkPanel` component with the same default
      min/max-width props, stacked in a flex-column, so they render at
      identical widths at any viewport size; confirmed visually in the
      browser.
