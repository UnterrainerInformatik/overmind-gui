## Context

`overmind-gui` is frontend-only; there is no backend code in this repo. The
app's own backend (`java-overmind-server`) is reached through
`BaseService`/`rest.ts`-based services (`appliancesService.ts`,
`migrationsService.ts`, etc.). External systems that are not the app's own
backend get a small dedicated service kept outside that layer —
`frigateService.ts` is the existing example, talking straight to a
hardcoded external host. No Double Take (or CompreFace) base URL or
credential exists anywhere in this repo today. See proposal.md - Why /
Impact.

`Kiosk*` pages follow two reachability conventions (`kiosk-personen-page`
design, archived): primary dashboards get a tile on `KioskOverview.vue`
and call `kioskMode(true)` on mount because kiosk mode isn't sticky yet;
technician/diagnostic pages reached only via a link from another kiosk
page skip that call because kiosk mode is already sticky by the time the
user gets there. `KioskMigrations.vue` is the existing example of the
second pattern.

## Goals / Non-Goals

**Goals:**
- Let a user manage people and reference images for face recognition from
  inside this app.
- Reuse existing conventions (`Kiosk*` page/router pattern, dedicated
  external-service client) rather than introducing new ones.

**Non-Goals:**
- Talking to Frigate or CompreFace directly for this feature — Double
  Take is the system of record for people/reference images (CompreFace
  is what Double Take manages under the hood, per proposal.md - Why).
- Changing how `KioskPersonen`'s live detection overlay resolves names
  (`sub_label`/`sub_label_score` via Frigate) — unaffected by this change.
- Bulk/batch person import, or any editing of a person beyond name and
  reference images.

## Decisions

**New page follows the `KioskMigrations` reachability pattern, not the
primary-dashboard pattern.** It's reached only via the new button on
`KioskPersonen`, not from the kiosk overview (per proposal.md and the
`kiosk-personen-management-page` spec). By the time a user is on
`KioskPersonen`, kiosk mode is already sticky, so the new page does not
call `kioskMode(true)` on mount — same rationale `KioskMigrations.vue`
already documents.

**A new `doubleTakeService.ts` talks to Double Take's admin API directly
from the browser**, kept outside `BaseService`/`rest.ts` like
`frigateService.ts`, rather than proxying through `java-overmind-server`.
Alternative considered: add a proxy in the app's own backend. Rejected for
consistency — `frigateService.ts` already established that external
detection-stack systems are called directly from the client, and there is
no existing backend code in this repo to extend. The base URL (and any
auth) is not yet configured anywhere in this repo; see Open Questions.

**Component-local state, no new Vuex module.** `KioskPersonen.vue` already
manages its (comparable) tracked-persons data as component-local state
rather than through Vuex; the management page's data (list of people,
selected person's images) isn't needed anywhere else, so it follows the
same pattern.

**Destructive actions get a lightweight confirmation dialog.** No
confirm-dialog component exists in this repo yet
(`kiosk-personen-management-page` spec, Confirmation requirement); this
change adds one small reusable Vuetify `v-dialog`-based confirmation
component rather than inlining the confirmation per action, since delete-
person and remove-image both need it.

**Image upload uses Vuetify's `v-file-input`.** No file-upload component
exists in this repo yet; `v-file-input` (already part of the project's
Vuetify dependency) covers picking one or more images without adding a
new dependency.

**People are name-keyed, not id-keyed, and "create person" requires at
least one reference image.** Confirmed against the running Double Take
instance (`https://doubletake.unterrainer.info`, v1.13.11.8, `auth: false`)
and its server source (`jakowenko/double-take`): Double Take has no
"person" entity of its own — a person is simply the distinct `name` used
on training images under `POST /api/train/add/:name`. There is no
endpoint to create a person without at least one image, so
`doubleTakeService.createPerson` takes both a name and one or more files;
the "create a person" UI collects a name and at least one image in a
single step rather than two, and a person only appears once that first
upload succeeds. `deletePerson`/`getReferenceImages`/etc. take the
person's `name: string` as identifier, not a numeric id. (User-confirmed
this can call Double Take directly rather than CompreFace, resolving the
earlier open question about which system to target for creation.)

**Removing an image or a person needs two Double Take calls, not one.**
`DELETE /api/train/remove/:name` only unregisters an image from the
face-recognition detector (e.g. CompreFace) — it does not delete the
underlying file or its `file` table row, so the image would still be
listed afterwards. Actually deleting it requires a second call,
`DELETE /api/storage/train` with `{files: [{id, key}]}`, which removes the
file record and the file on disk. `deleteReferenceImage` issues the
`train/remove` call followed by that `storage/train` call.
`deletePerson` instead follows `train/remove` (no ids, so it unregisters
the whole name from the detector) with
`DELETE /api/filesystem/folders/:name`, which removes the person's whole
training folder, its files, and the matching `file`/`train` rows in one
call — the same operation the real Double Take UI's own folder-removal
control performs, and simpler than deleting each image individually.

**Creating a person (or adding a first image after that) must create the
training folder before uploading, or Double Take's server crashes.**
Confirmed by triggering it against the running instance: `POST
/api/train/add/:name` writes an uploaded file straight into
`train/<name>/` (`fs.writeFileSync`, no existence check, no
`mkdirSync`). For a name that has never been trained before, that
directory does not exist, the write throws `ENOENT`, and — because
nothing in Double Take's route catches it — the whole Node process
crashes and Docker restarts it, taking the household's live face
recognition down for a few seconds. This is a bug in Double Take
(`api/src/util/fs.util.js`'s `writer`) itself, not something fixable in
this repo. The real Double Take UI avoids it without knowing it: its
"add new" folder picker calls `POST /api/filesystem/folders/:name`
first (a guarded, idempotent `fs.mkdirSync`), and only the
`ids`-based promote-an-existing-detection upload path (which this app
doesn't use) is otherwise reachable for a brand-new name. `doubleTakeService`
does the same — every upload (`createPerson` and
`uploadReferenceImages`, via a shared `addTrainingImages`) calls
`POST /api/filesystem/folders/:name` immediately before the
`train/add` call, safe to call even when the folder already exists.
Also matches the real UI: a newly typed name is lowercased before use
(every existing name in this instance is already lowercase).

**A GET right after an upload can transiently 500 and needs a retry.**
Also confirmed live: `train.add()` runs as a fire-and-forget background
job after `POST /api/train/add/:name` responds, writing to the SQLite
database as it registers the image with the detector. A `getPeople()` or
`getReferenceImages()` call fired immediately after that upload can race
those writes and fail with a transient 5xx even though the upload itself
succeeded. `doubleTakeService` retries a GET up to twice more (short
delay, 5xx/network errors only) before giving up, so the view's
post-upload refresh doesn't surface a spurious error for a write that
actually succeeded.

## Risks / Trade-offs

- [Double Take's admin API is called directly from kiosk browsers, which
  are shared/unattended devices] → Mitigated by the confirmation-dialog
  requirement on delete/remove actions; if Double Take's API needs an
  auth token, that token would be visible to anyone with access to the
  kiosk device's network traffic or dev tools, same exposure
  `frigateService.ts`'s host already has today.
- [No existing spec or code confirms Double Take's exact API surface for
  person/image CRUD in this environment] → Resolved by verifying the
  actual endpoints against the running Double Take instance during
  implementation (tasks.md), the same way the archived `kiosk-personen`
  design verified Frigate's live API before implementation.

## Open Questions

None outstanding. Resolved during implementation:
- Base URL: `https://doubletake.unterrainer.info`. No auth token required
  — the running instance's `/api/config` reports `"auth": false`, which
  Double Take's own `jwt` middleware treats as "skip the check entirely",
  so `doubleTakeService.ts` sends no auth header, same as
  `frigateService.ts`.
- Exact endpoints/payloads: see the Decisions above and tasks.md 1.1/1.2.
