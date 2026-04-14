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
