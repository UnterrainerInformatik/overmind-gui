# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

---

## Radio quick select: twelve tiles instead of eight

The server now answers up to **12** stations on `GET /audio/radio` (overmind-server commit
`93ebafe8`, `AudioLibrary.RADIO_STATIONS = 12`; first 12 entries of the MA playlist `Radio`,
in MA's order). The kiosk radio popup has to show all of them.

- `openspec/specs/kiosk-audio-bar/spec.md` (~line 210) still says "at most 8" — raise it to 12
  and adjust any scenario that counts stations.
- `src/components/audio/AudioRadioDialog.vue`: the doc comment says "up to eight". The grid is
  `repeat(auto-fill, minmax(120px, 1fr))` inside a 640px dialog, so twelve tiles should land as
  3 rows of 4 — verify on the kiosk display that all twelve fit without scrolling (and on
  `xsOnly` fullscreen), tightening tile size/gap only if needed.
- Check that nothing else caps the list at 8 (`audioService.getRadio`, store, tests).
