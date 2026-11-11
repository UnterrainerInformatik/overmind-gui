---
name: conventions
description: Hard rules for code style and user preferences — English-only identifiers/comments, testing attitude.
---

# Conventions

## Language: English only

All **variables, function/class names, comments, commit messages, and
docs** must be in English. No German — not for domain terms, not for
abbreviations, not even as a fallback.

**Why**: user rule stated explicitly on 2026-04-14.

**How to apply**:
- When naming new symbols, pick English words even if the domain
  concept has a natural German name.
- Existing code that contains German identifiers (e.g. the hardcoded
  item descriptions in `KioskOverview.vue` like `'Alle weg / da'`,
  `'Eltern-SZ Nickerchen'`) is allowed to stay — those are **display
  strings** that eventually belong in `de-AT.json`. Don't hunt them
  down, but don't add new ones either.
- i18n JSON files (`src/locales/de-AT.json`) are the **only** place
  where German is expected.

## Tests: welcome, but there is no framework yet

The user likes tests in general ("I like tests in general",
2026-04-14). The project currently has **no test runner configured**
(see `known-issues-and-smells.md` § 7).

**Why**: stated preference, but no pre-existing infrastructure to
plug into.

**How to apply**:
- For small/UI-only changes, don't force tests.
- For new utility functions, service methods, or logic-heavy code
  (e.g. anything in `src/utils/`), offer to add a test — but
  **ask before wiring up a test runner** (Jest/Vitest/etc.) since
  that requires new devDependencies and a `test` script in
  `package.json`.
- If a test framework gets added later, this memory should be updated
  to point at it.

## Tests against production: always clean up Music Assistant playlists

There is no staging; `npm run serve` and every live check hit the real
backend and the family's real Music Assistant library.

**Rule**: every playlist created for a test MUST be deleted again right
after the test — also when the test failed or was aborted — and the
editable playlist list (`GET /audio/playlists`) checked afterwards so
nothing of yours is left over.

Real editable playlists (as of 2026-11-11): Alexander, Gerald, Radio,
Sarah, Stefan, Weihnachten. Never touch those or MA's non-editable smart
playlists. Every other editable playlist is test debris.

**Why**: the user had to ask for cleanups on 2026-11-04 and again on
2026-11-11 (23 leftovers, several with identical names, which made later
tests open an old playlist instead of the new one). The
java-overmind-server repo carries the same rule.

**How to apply**: give each test playlist a unique name (e.g.
`zz-claude-<timestamp>`), address it by id, delete it in a `finally`
block (`DELETE /audio/playlists/{id}`), then verify via the list.
