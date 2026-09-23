## 1. Contract and arithmetic

- [x] 1.1 Add `recordingRingBytes`, `recordingsBytes`, `recordingRateBytesPerHour` and `storageReportedAt` (all `| null`) to `CameraNode` in `src/utils/webservices/interfaces/CameraNode.ts`, with a comment naming design.md D2 as the guessed contract; verify with `npm run lint` and a type-checked `npm run build`
- [x] 1.2 Add to `src/utils/cameraUtils.ts` the named thresholds (`HEADROOM_RED_HOURS = 1`, `HEADROOM_YELLOW_HOURS = 24`, `STORAGE_STALE_HOURS = 1`) and pure functions for disk free, ring free, ring fill proportion, headroom hours, ring days, "danger applies" and headroom colour, each returning null for any unknown input (design D3); verify with lint and build
- [x] 1.3 Add `usage()` to `src/utils/webservices/archiveService.ts` reading `GET /archive/usage` → `{ capacityBytes, usedBytes, oldestStartTime? }` (design D4), with unconfigured and failure handled like the other archive reads; verify with lint and build

## 2. Gauge component

- [x] 2.1 Create `src/components/RecordingStorageGauge.vue` with a `dense` prop: ring fill bar (one neutral colour, `blue-grey lighten-1` - see design D5, "full, oldest recordings are overwritten" at ≥ 100 %), ring days, "no ring configured" state, disk headroom bar coloured by 1.2's colour, and all unknown/rate-unknown/rate-zero texts; verify in the browser harness (task 5.1)
- [x] 2.2 Add to the full form the reading's time, the "may be out of date" notice past 1 h (colour kept), the "ring larger than the disk" notice, and the red-band text saying that Frigate starts deleting on its own; verify in the browser harness
- [x] 2.3 Add an archive mode (or a ring-only slot) that shows only fill level, GB of GB and the "reaches back to <date>" line, without disk headroom; verify in the browser harness
- [x] 2.4 Add all new texts to `src/locales/de-AT.json` and `src/locales/en-US.json` under `page.kiosk.cameras.storageGauge` and `page.kiosk.archive.usage`; verify that no raw i18n key appears in any harness screenshot

## 3. Kameras page

- [x] 3.1 Replace the bare `storageText` line in `src/components/CameraNodeDialog.vue` with the full gauge, and remove the now unused computed and locale keys; verify in the harness that the detail shows the gauge and still shows version and default retention
- [x] 3.2 Add the dense gauge to each node row in `src/views/KioskCameras.vue`; verify in the harness that a red-band node is red in the list without opening its details, and that the row stays usable at phone width (360 px)

## 4. Archive

- [x] 4.1 Show the archive gauge on `src/views/KioskPersonenArchiv.vue` above the list, loaded independently of the list so a failed usage read leaves the list intact and shows the fill level as unknown; verify in the harness with the usage route failing and the items route succeeding
- [x] 4.2 Check the save path on the events page for 507-specific wording and for any "forever"/"dauerhaft" promise in the save confirmation, and adjust the wording to the ring semantics; verify that the events page derives "saved" from the archive entry alone, so a displaced entry shows as savable again (spec event-archive-saving)

## 5. Verification and docs

- [x] 5.1 Add suite `suites/recording-ring-buffer.mjs` to the browser harness with node mocks for: partly filled ring, full ring, no ring, ring larger than disk, headroom 40 min / 10 h / 3 days, rate unknown, rate zero, all unknown, stale reading; plus archive usage partly full, full, empty and failing; run it and review every screenshot in light and dark
- [x] 5.2 Run `npm run lint` and `npm run build` (the dev server skips type checking) and confirm both pass
- [x] 5.3 Update `java-overmind-server/docs/video-capabilities.md` (node facts, section 7 "Wie lange Aufnahmen bleiben", section 11 table) to describe the node ring, the gauge colours and the archive as a ring, marked 🕓 Geplant until the server change ships
- [x] 5.4 Add the server counterpart to `ai/open-proposals.md`: ring env + overrides, 5-minute enforcement job with the open Frigate delete call (design D1), the node fields (D2), `GET /archive/usage` and eviction replacing the 507 in `ArchiveBudget` (D4); verify that the entry names every contract field this change relies on
