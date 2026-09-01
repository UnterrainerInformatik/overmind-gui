## 1. Teardown in the view

- [ ] 1.1 Add a `stopClip()` method to `KioskPersonenEvents.vue` that tolerates a
      missing `$refs.clipVideo`, pauses the element, detaches its source
      (`removeAttribute('src')` then `load()`, per design.md), and only then
      calls the existing `releaseClipBlob()`. Verify by opening an event with a
      clip in the running app and calling the teardown from the console: the
      clip goes silent and `video.currentSrc` is empty.
- [ ] 1.2 Watch `detailDialog` and call `stopClip()` on the `true → false`
      transition only. Verify the watcher does not fire teardown on open by
      opening an event and confirming its clip still starts playing by itself.
- [ ] 1.3 Reduce `closeEvent()` to setting `detailDialog = false`, so the
      cleanup lives only in the watcher. Verify both close buttons still close
      the dialog and still stop the clip.
- [ ] 1.4 Route `beforeDestroy` through `stopClip()` instead of
      `releaseClipBlob()`, keeping the `clearInterval` as is. Verify by
      navigating back to `KioskPersonen` while a clip plays: the audio stops.

## 2. Browser verification

- [ ] 2.1 Add a suite `events-clip-stops-on-close.mjs` to the harness at
      `~/.local/share/overmind-gui-verify/suites/` (extend, do not rebuild),
      reusing the existing `frigate.mjs` mock and `clip.mp4`. Verify it runs
      green via `~/.local/share/overmind-gui-verify/run.sh
      events-clip-stops-on-close`.
- [ ] 2.2 Cover the four closing paths in that suite — each close button, the
      Escape key, and a backdrop click — asserting after each that the video
      element is `paused` and carries no `currentSrc`. Verify all four cases
      report pass.
- [ ] 2.3 Cover re-opening in that suite: after a close, open the same event
      again and assert its clip plays from near zero, then open a different
      clip-bearing event and assert the same. Verify both cases report pass.
- [ ] 2.4 Cover leaving the page: with a clip playing, navigate back to
      `KioskPersonen` and assert no media element is left playing. Verify the
      case reports pass.

## 3. Regression check

- [ ] 3.1 Confirm the mounted-element optimisation is intact: opening several
      clip-bearing events in a row reuses one `<video>` element rather than
      creating one per open. Verify by asserting the element count in the suite
      stays at one across opens.
- [ ] 3.2 Run `npm run lint` and `npm run build` and verify both complete
      without new errors or warnings for `KioskPersonenEvents.vue`.
