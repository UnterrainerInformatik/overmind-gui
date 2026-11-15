## Context

See proposal.md (Why). Current state in code:

- `utils/audioShuffle.ts` is a `Vue.observable` device preference (`localStorage`
  `kioskAudioShuffle`), read by `AudioPlaylistEditor` (passed as `shuffle` prop to
  `AudioPlaylistTracks`, which renders `audio-tracks-shuffle`) and by `AudioQueueDialog`
  (`audio-queue-shuffle` in the playlists column head). Both send it as `shuffle` in
  `audioService.playMedia`.
- `AudioPlayback.shuffle` is already normalised from the server state (`p.shuffle === true`);
  the server sets it from MA's `shuffle_enabled` and counts it as a significant change, so a
  switch reaches the GUI as an `audio-state` push.
- java-overmind-server already has `MaApi.shuffle(queueId, enabled)` (`player_queues/shuffle`) and
  uses it inside `playMedia`. There is no route to call it alone.
- `KioskAudioBar` hides previous / ±10 s below 600 px (`narrow` = `xsOnly`) and holds a released
  volume until the state shows it or `HOLD_MS` (3 s) passes. `audioCommand` mixin runs a command
  and shows a snackbar on failure.

## Goals / Non-Goals

**Goals:**
- One source of truth for shuffle: the target's player queue.
- Same toggle behaviour in the bar and in the queue popup.

**Non-Goals:**
- No shuffle on the kiosk audio page (it has no player controls today).
- No repeat mode or other queue settings.
- No server-side code in this repo; the server route is specified here as the contract.

## Decisions

### D1: Server contract `PUT /audio/targets/{targetId}/shuffle {enabled}`

`{enabled: boolean}` → `204`; `404` for an unknown target; `502` with a `reason` when MA fails;
`400` when `enabled` is missing or not a boolean. The server calls `ma.shuffle(queueId,
enabled)` for the target's queue (the group player's queue for the main group, the same queue
resolution `playMedia` uses), and the next `audio-state` carries the new `shuffle`. GUI rest key
`audioTargetShuffle: '/audio/targets/{targetId}/shuffle'`, service method
`setShuffle(targetId, enabled)` via `axiosUtils.putToPath`, like `setTargetVolume`.

Field name `enabled` matches MA's `shuffle_enabled` and reads well in `{enabled: true}`.
Alternatives: `{shuffle}` (repeats the path), `{on}` (unusual in this API, which uses
`grouped`/`muted`/`linked`), or `POST .../shuffle` toggling without a body (racy when two devices
tap at once, and not idempotent).

### D2: Shared toggle component `AudioShuffleToggle`

A small component with prop `target` (the resolved target object both the bar and the popup
already have). It shows `held !== null ? held : target.playback.shuffle`, on tap sends
`setShuffle(target.targetId, !shown)` through the `audioCommand` mixin, sets `held` and starts a
3 s timer. A watcher on `target.playback.shuffle` clears the hold when the state equals `held`;
the timer clears it in any case; a failed command clears it at once. A change of `targetId`
clears the hold too. Icon `shuffle` / `shuffle_on`, light-blue when on (as today), `aria-pressed`,
`aria-label` always, `title` only when tooltips are on (bar convention). Disabled when `target`
is null or the state is unavailable (prop `disabled`).

Rationale: the bar and the popup must behave alike (spec); one component avoids two copies of
the hold logic. Alternative: no hold, just wait for the state — the button would visibly do
nothing for ~0.5–1 s after a tap, which reads as "did not work" on a tablet. Alternative: put the
hold in the shared audio state store — overkill for one boolean, and the store is a pure mirror
of the server today.

### D3: Placement

- Bar: between `next` and `AudioSeekSlider`, `v-if="!narrow"` like previous / ±10 s. The bar
  already fits 9 controls at 600 px+; one icon button more fits (verify at 600 and 800 px).
- Queue popup: a head row at the top of the queue column (`audio-queue-queue-head`, sticky in
  the wide layout, like the playlists head) with the overline "Warteliste"/queue text on the
  left and the toggle on the right. Shown on every width, also when the queue is empty or failed
  to load (shuffle is a property of the player, not of the loaded list).
- Removed: `audio-tracks-shuffle` (playlist action bar) and `audio-queue-shuffle` (playlists
  head). In `AudioPlaylistTracks`, the action bar renders only for editable playlists (it would
  be empty otherwise).

Alternative: only in the popup — the user asked for the player bar; only in the bar — phones
would lose shuffle entirely.

### D4: Queue reload on shuffle change

Add `p.shuffle` to `AudioQueueDialog.queueSignature`. When MA reshuffles the running queue the
upcoming entries change order, and the popup should show that without a manual reopen. Cost is
one extra `GET queue` per switch while the popup is open.

### D5: Starts send no `shuffle`

`audioService.playMedia(targetId, uri, startIndex?)` loses the `shuffle` parameter (all callers
are in this repo; `AudioLibrarySearch` and radio already send none). The server keeps accepting
the field, so nothing breaks there. `utils/audioShuffle.ts` is deleted; the stale
`kioskAudioShuffle` key stays in browsers that had it — harmless, not worth migration code.

### D6: Locale keys

`page.kiosk.audio.editor.shuffleOn/shuffleOff` move to `page.kiosk.audio.shuffleOn/shuffleOff`
(both locales), since the editor no longer uses them. Texts stay "Zufällig: ein/aus" /
"Shuffle: on/off". A tooltip key `page.kiosk.audio.tooltip.shuffle` is not needed; the title is
the on/off text.

### D7: Radio

No special case: the toggle stays enabled. Shuffling a one-item radio queue is harmless and the
mode carries over to the next playlist start, which is what "player setting" means.

## Risks / Trade-offs

- [MA may only apply shuffle when the queue is next built — the server's `MaApi.shuffle` javadoc
  says so, while MA's `player_queues/shuffle` reorders the upcoming items in current versions] →
  The GUI does not depend on it: the toggle shows the state's mode either way. The server session
  checks the real behaviour; if MA does not reorder, the spec still holds (mode switched at once,
  effect on the next build), and D4's reload is simply a no-op.
- [Server route not built yet] → Switching answers 404, the hold clears and a snackbar shows; the
  toggle still shows the real mode. GUI and server can deploy in any order.
- [Marking the playing row while shuffled] → Already handled by the URI fallback in
  `utils/audioPlaying.ts`; nothing changes.
- [Two devices tap at once] → `PUT` with an explicit value is idempotent; the last one wins, and
  both toggles end on the state's mode.
- [Users relied on "start shuffled" per device] → The bar's toggle before the start gives the same
  result, and it now also is what the player really does.

## Migration Plan

1. Server: add the route (java-overmind-server session, separate change there).
2. GUI: this change; deployable before or after step 1 (see Risks).
3. Rollback: revert the GUI commit; the server route can stay.
