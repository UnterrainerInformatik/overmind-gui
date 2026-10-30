# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

---

## Audio — quick filter in the queue popup's playlist list

- The playlist section of the audio bar's queue popup
  (`AudioQueueDialog.vue`, spec `kiosk-audio-bar` → "Queue and playlist popup")
  gets a text field above the list that narrows the playlists to those whose
  name contains the typed text (case-insensitive, client-side, like the
  editor's filter in `AudioPlaylistList.vue`).
- Meant as a quick search: people type at most two or three letters, so no
  debounce, no server search, no minimum length. Clearable; empty shows all.
- The filter is reset when the popup opens again. A "no match" text when
  nothing is left; the queue section stays unaffected.
- Touch-first: the field must not pop the on-screen keyboard by itself when
  the popup opens (no autofocus).
