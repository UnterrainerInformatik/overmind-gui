## Context

`AudioQueueDialog.vue` loads `playlists` from `GET /audio/playlists` each time it opens and again
after the playlist editor closes, and renders them with a plain `v-for`. The editor's list
(`AudioPlaylistList.vue`) already filters by name with a dense, outlined, clearable
`v-text-field` and a `trim().toLowerCase()` + `includes` match. The popup is the kiosk's touch
UI; the dialog is fullscreen on phones.

## Goals / Non-Goals

**Goals:**
- Same look and matching rule as the editor's filter, so both lists behave alike.

**Non-Goals:**
- Filtering the queue, or sharing filter state with the editor.
- Extracting a shared filter component: two call sites with a one-line rule do not warrant it.

## Decisions

- **Local `playlistFilter` data + `shownPlaylists` computed.** The computed applies the editor's
  rule (`trim().toLowerCase()`, `includes` on `name`). The `v-for` iterates `shownPlaylists`.
  Alternative: watcher-maintained filtered array — more state, no gain.
- **Reset in the existing `value` watcher**, next to `loadQueue()`/`loadPlaylists()`, when the
  popup opens. Not on close, so the closing animation does not show the list jumping. The reload
  after the editor closes does not touch the filter.
- **No `autofocus`** on the field. On open, Vuetify 2's `v-dialog` focuses its own content
  element, not the first input, so the field stays unfocused and the on-screen keyboard closed.
  Verified in the browser suite by checking `document.activeElement` after opening.
- **Field placement:** a row of its own between the "Playlisten" header (with the edit button)
  and the list, so the header row stays uncluttered on phone width. Hidden when loading failed
  or when there are no playlists at all (nothing to filter); the existing "no playlists" text
  stays for the empty library, and the new no-match text is shown only when the filter is
  non-empty and leaves nothing.
- **Texts:** reuse `page.kiosk.audio.editor.filter` ("Filtern") and
  `page.kiosk.audio.editor.noPlaylists` ("Keine passenden Playlists.") — both already say
  exactly what is needed.
- **`clearable` sets the value to `null`**; store `$event || ''` as the editor does.

## Risks / Trade-offs

- [Vuetify dialog moves focus into the dialog on open, possibly onto the field] → the browser
  suite asserts the field is not `document.activeElement` after opening; if it is, add
  `retain-focus="false"` or focus the card instead.
- [Reused `editor.*` locale keys couple the popup to the editor's wording] → acceptable; if the
  editor's text changes in a way that does not fit, split the keys then.
