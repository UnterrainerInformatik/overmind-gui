## Why

Reference images for face recognition (the people CompreFace/Double Take
matches against) can currently only be managed by opening Double Take's own
admin UI directly. That is a separate tool with its own login and UX, and it
sits outside the kiosk app that staff already use to check who is in the
basement. Managing people and their reference photos should happen inside
this app instead.

## What Changes

- Add a "Personen" button to the `KioskPersonen` page, positioned below the
  existing back button and matching its width, that opens a new person/face
  management page.
- Add a new page (reachable only from that button, not from the kiosk
  overview) that lets a user:
  - create a new person
  - view a person's reference images
  - upload and attach new reference images to a person
  - remove a single reference image from a person
  - delete a person entirely (including their reference images)
  - navigate back to the `KioskPersonen` page via a back link
- Introduce a dedicated client for Double Take's admin API (following the
  existing `frigateService.ts` convention of a small service kept outside
  `BaseService`/`rest.ts` for external systems, rather than going through
  the app's own `java-overmind-server` backend).

## Capabilities

### New Capabilities
- `kiosk-personen-management-page`: a page for creating/deleting people and
  managing (viewing, uploading, removing) their face-recognition reference
  images, reached from a new button on the `KioskPersonen` page.

### Modified Capabilities
- `kiosk-personen-page`: adds a "Personen" management button below the
  existing back button, same width, navigating to the new management page.

## Impact

- Affected views: `src/views/KioskPersonen.vue` (new button), new
  `src/views/Kiosk*.vue` management page, new router entry in
  `src/router/index.ts`.
- Affected services: new `src/utils/webservices/doubleTakeService.ts` (or
  similar) talking directly to Double Take's admin API for people and
  reference images; base URL and auth are not yet configured anywhere in
  this repo and need to be established during implementation, the same way
  `frigateService.ts` hardcodes the Frigate host today.
- No existing Vuex store module covers persons/faces; this feature can
  follow the same component-local-state pattern `KioskPersonen.vue` already
  uses, or introduce a small dedicated store module if state needs to be
  shared across the two pages.
- Security/exposure: this page runs on kiosk devices (tablet, mobile, PC),
  so destructive actions (delete person/image) are reachable from shared
  devices; needs a design decision on whether any confirmation/guard is
  warranted, consistent with how other destructive kiosk actions are
  handled today.
