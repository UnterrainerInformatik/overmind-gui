## 1. Service and shared helpers

- [x] 1.1 Add route keys `cameraRecordingJobs: '/cameras/{id}/continuousRecording'` and `cameraRecordingJobEnd: '/cameras/{id}/continuousRecording/{windowId}/end'` to `src/store/rest.ts`, with a comment block naming this change and the three shapes (design, Context); verify with lint
- [x] 1.2 Create `src/utils/webservices/recordingJobsService.ts` (design D1): `getWindows(cameraId)`, `start(cameraId, endEpochSeconds, storageChoice)` and `end(cameraId, windowId)`, with lowered enums, UTC `LocalDateTime` ↔ epoch seconds in both directions, and a JSDoc header stating the contract and that it was checked against the server source and its 2026-09-10 smoke test; verify with lint and `npm run build`
- [x] 1.3 Move the minutes/hours/days duration formatter out of `src/components/RecordingStorageGauge.vue` into a shared helper, and have the gauge use it (design D3); verify in the harness that the `recording-ring-buffer` suite's screenshots are unchanged
- [x] 1.4 Add a pure `recordingVolumeBytes(bitrateKbps, hours)` to `src/utils/cameraUtils.ts` with the 30 GB/day fallback flagged as a rule of thumb, and rewrite `CameraStreamSettings.storageEstimate` to use it (design D6); verify that 4096 kbit/s over 24 h gives about 42 GB, and that no bitrate over 168 h gives 210 GB, in the harness suite (task 5.1)

## 2. Job dialog

- [x] 2.1 Create `src/components/CameraRecordingJobDialog.vue` with the start form (design D4): quick 1 Stunde / 1 Tag / 1 Woche buttons filling a themed `datetime-local` input, a local/central radio group with the consequence text for each, the volume estimate, and a start button that is disabled with a reason while the end is not in the future; verify in the harness that "1 Tag" + local sends `{ endTime, storageChoice: "LOCAL" }` with a UTC end 24 h ahead
- [x] 2.2 Add the running-job view: local end moment, time remaining, storage choice, and "Auftrag beenden" behind `ConfirmDialog` with the "returns to its previous recording settings" wording; verify in the harness that cancelling sends nothing and that confirming calls the end route
- [x] 2.3 Add the unknown-state view with a retry, and the in-dialog `v-alert` for refusals showing `err.serverMessage` verbatim (or a general message when it is empty), keeping the form values and asking the page to re-read; verify in the harness with mocked 409, 400 and 500 answers
- [x] 2.4 Add every new text to `src/locales/de-AT.json` and `src/locales/en-US.json` under `page.kiosk.cameras.recordingJob`; verify that no raw i18n key appears in any harness screenshot

## 3. Kameras page

- [x] 3.1 In `src/views/KioskCameras.vue`, read every camera's windows in parallel after the camera list loads, into a map of active window / `null` / `undefined` (design D2), and re-read one camera after a start, end or refusal; verify in the harness that one failing camera read leaves the others intact and shows that camera's state as unknown
- [x] 3.2 Add the row action (`fiber_manual_record`, tinted `error` while a job runs) before `tune`, and the subtitle "Zeichnet auf · noch …"; verify in the harness at 360 px width that the row stays usable
- [x] 3.3 Add the running-jobs list above the camera list, shown only while a job is active, each row opening that camera's dialog (design D5); verify in the harness with zero, one and two active jobs
- [x] 3.4 Add the 30-second `now` tick that runs only while a job is active and is cleared on `beforeDestroy`, and the re-read when an end moment passes (design D3); verify in the harness that a job ending 40 s after load disappears after the re-read returns it ENDED

## 4. Archive

- [x] 4.1 Pass a `title` from `kindLabel()` for non-event items in `KioskPersonenArchiv.mapItem`, and show `entry.title || entry.subLabel || unknown` in `src/components/EventTile.vue` (design D7); verify in the harness that a `RECORDING` item without a subLabel reads "Aufzeichnung", and that it plays and deletes like an event entry

## 5. Verification and docs

- [x] 5.1 Add suite `suites/camera-recording-jobs.mjs` to the browser harness with mocks for: no jobs, one local job, one central job, two jobs, a job ending within the minute, one camera's read failing, and start refusals 409/400/500; run it and review every screenshot in light and dark
- [x] 5.2 Run `npm run lint` and `npm run build` (the dev server skips type checking) and confirm both pass
- [x] 5.3 Update `java-overmind-server/docs/video-capabilities.md` section 9 (design D8): change it to ✅ Verfügbar, rewrite Variante B to say the footage is copied centrally and stays on site under the node's retention, and mark freeing on site as 🕓 Geplant; verify that the section makes no promise the server's `continuous-recording` spec does not keep
- [x] 5.4 Acceptance against the deployed server: start a short local job on a real camera, see it counted down on the Kameras page, end it early, then start a short central job and find its range in the archive as "Aufzeichnung"; record the date in `recordingJobsService.ts`
