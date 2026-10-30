## 1. Popup filter

- [x] 1.1 Add `playlistFilter` data and a `shownPlaylists` computed (trimmed, case-insensitive `includes` on `name`) to `AudioQueueDialog.vue`, and render the playlist `v-for` from it; verify typing "ra" in the browser narrows the list
- [x] 1.2 Add the dense, outlined, clearable filter field (`page.kiosk.audio.editor.filter`, search icon, no autofocus, `$event || ''`) in its own row under the playlists header, shown only when playlists loaded and the library is not empty; verify it renders at phone and kiosk width
- [x] 1.3 Show the `page.kiosk.audio.editor.noPlaylists` text when the filter is non-empty and leaves nothing, keeping the existing empty-library text; verify the queue section is unaffected
- [x] 1.4 Reset `playlistFilter` in the `value` watcher when the popup opens (not on the reload after the editor closes); verify reopen shows all playlists

## 2. Verification

- [x] 2.1 Extend `~/.local/share/overmind-gui-verify/suites/kiosk-audio-bar.mjs` with the spec scenarios (narrow, case, clear, no match with queue intact, reset on reopen, field not focused on open, filter kept after editor reload) and verify the suite passes
- [x] 2.2 Run `npm run lint` and the production build (`npm run build`) and verify both succeed
