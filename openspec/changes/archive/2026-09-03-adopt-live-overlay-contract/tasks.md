## 1. Read the new fields in the service

- [x] 1.1 Let `getTrackedPersons()` ask for `inProgress=true` and drop the
  client-side filter on a missing `endTime`; verify by reading the request the
  live page issues and seeing the parameter on it
- [x] 1.2 Normalise an absent `subLabelScore` to `null` when building
  `FrigateTrackedPersonData`, so the declared `number | null` holds; verify a
  detection with no sub-label reaches the overlay with `sub_label_score: null`
  rather than `undefined`
- [x] 1.3 State the payload's own rules at the fields in the class comment —
  `box` as `[x, y, width, height]` normalised to 0..1, `subLabelScore` absent
  rather than `0`, `zones` always a list — and record that `box` is the best
  frame's box rather than the live position; verify by reading the comment
  against `ai/draft-live-overlay-for-frontend.md` in java-overmind-server

## 2. Let the node filter the events page

- [x] 2.1 Let `getPastEvents()` send `inProgress=false` and, when a name is
  set, `subLabel=<name>` url-encoded, dropping both client-side filters;
  verify the request carries both parameters and the answer needs no sieving
- [x] 2.2 Remove `returned` from `FrigateEventsPage` and decide a full page on
  the number of events the server sent; verify `npx vue-cli-service build`
  reports no consumer left reading the field
- [x] 2.3 Remove `NAME_FILTER_PAGE_SIZE` from `KioskPersonenEvents.vue` and
  fetch `PAGE_SIZE` events whether or not a name filter is set; verify a
  filtered page requests 30 rather than 300

## 3. Specs

- [x] 3.1 Record in `kiosk-personen-page` that an unreported face-match
  confidence is omitted rather than drawn as zero, and that a detection
  without a position is not drawn; verify `npx openspec validate --strict`
  accepts the delta
- [x] 3.2 Record in `kiosk-personen-events-page` that a name filter matches an
  event naming several persons including the chosen one, and that such an
  entry keeps the label the source reported; verify the same way

## 4. Verification

- [x] 4.1 Run `npx vue-cli-service lint` and `npx vue-cli-service build` and
  verify both pass with no new warning
- [x] 4.2 Add a `live-overlay-contract` suite to the browser verification
  harness driving the Personen page, and verify the live poll asks
  `inProgress=true`, that a completed and a box-less detection both stay off
  the overlay, that a named box reads "Alexander 87% / 62%" while an unnamed
  one reads "? 87%" rather than showing a zero, and that `box` is drawn as
  [x, y, width, height] — [0.25, 0.4, 0.2, 0.3] against a 1000x500 canvas
  strokes (250, 200, 200, 150), which is the check that catches a swapped
  order
- [x] 4.3 Extend the same suite over the events page and verify a name filter
  puts `subLabel=` and `limit=30` in the request, that an in-progress event is
  not listed as a past one, and that an event naming "Alexander, Marlene"
  appears under either name with the label it was given

The harness answers overmind's routes from `mocks/frigate.mjs`, which is
written to the deployed contract rather than to the live host — the live
picture itself cannot be driven, because the stream is go2rtc over a WebSocket
the harness does not mock. The server side of the contract is verified on the
server: `ai/draft-live-overlay-for-frontend.md` records it measured against the
running Frigate 0.17.2 on 2026-09-02.
