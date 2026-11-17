## 1. Baseline

- [x] 1.1 With the harness at 1020 × 590, record for every kiosk page (overview, lights, plugs, presence, cameras, personen, migrations) the bottom edge of its last element and whether it scrolls; keep the numbers in this file under the task as the before state

  Before (harness suite `kiosk-page-bottoms`, viewport bottom edge after scrolling to the end,
  leaves and cards only; bar top at 549):

  | Page | Last element bottom | Scrolls (scrollHeight) |
  |---|---|---|
  | overview | 533 | yes, 597 (7 px) |
  | lights | 490 | no |
  | plugs | 490 | no |
  | presence | 490 | no |
  | cameras | 536 | yes, 1010 |
  | personen | 272 | no |
  | migrations | 536 | no |

  Note: the switch, multi-state and plan tiles are used only by `KioskOverview.vue`; lights, plugs
  and presence show a floor plan plus link tiles, so "Other kiosk pages keep their tiles" holds
  by construction.

## 2. Volume slider contrast

- [x] 2.1 Add `src/utils/audioVolumeColors.js` with `volumeSliderColors(dark)` and switch `AudioStreamCard.vue` and `AudioBalancePanel.vue` to it; verify their sliders still compute `rgb(79, 195, 247)` on the dark theme
- [x] 2.2 Pass the colours to the bar's volume slider and show its value at full opacity; verify in the harness that the open menu's filled track and thumb compute `rgb(79, 195, 247)` (dark) and `rgb(25, 118, 210)` (light)

## 3. Compact overview tiles

- [x] 3.1 Add `--kiosk-action-tile-height: 78px` to `src/styles/_kiosk.scss` and a `compact` prop to `KioskPanel.vue` that lays the title slot beside the text slot, fixes the height to the variable, uses 16 px / 17 px text and hides overflow; verify the lint passes
- [x] 3.2 Pass `compact` through `KioskSwitchPanel`, `KioskMultiStatePanel` (hint icon stays top right) and `KioskPlanPanel`, shrinking the avatar to 32 px when compact; set it on every action tile in `KioskOverview.vue`; verify in the harness that every action tile is 78 px (±2) and every link tile 60 px (±2)
- [x] 3.3 Verify in the harness that "Rollos Erdgeschoß runter" and "Kinderzimmer kuscheln" show all lines inside their tile and no text block has `scrollWidth > clientWidth`, and that the lights page's tiles keep their old height and stacked layout; take a screenshot of the overview for the user

## 4. Taller bar with bigger buttons

- [x] 4.1 Set `--kiosk-audio-bar-height` to 60 px and make the volume slider length `min(300px, calc(100vh - var(--kiosk-audio-bar-height) - 69px))`; verify the slider is 300 px at 1024 × 768 and 261 px at 844 × 390 with the whole menu above the bar
- [x] 4.2 Size the bar's icon buttons 56 / 44 / 36 px by breakpoint with 28 px icons from 600 px up (shuffle toggle included); verify widths at 1020, 800 and 390 px and that the bar never scrolls horizontally
- [x] 4.3 Rebuild the target selector as dot + icon over an 11 px, ellipsized name, at most 88 px wide, name hidden below 600 px; verify with "Haus" and a long room name in the harness, and that a tap still opens the audio plan popup

## 5. Verification and docs

- [x] 5.1 Update `suites/kiosk-audio-bar.mjs` to the new bar height and add a suite `kiosk-overview-room-for-audio-bar.mjs` that covers every scenario of this change's specs; both suites pass
- [x] 5.2 Repeat the 1.1 measurement on every kiosk page; the overview ends above the bar without scrolling, and any other page whose last element newly falls under the bar is reported to the user (not silently fixed)

  After (same suite, bar top now at 530):

  | Page | Last element bottom | Scrolls (scrollHeight) |
  |---|---|---|
  | overview | 466 | no, 590 (was 7 px) |
  | lights | 490 | no |
  | plugs | 490 | no |
  | presence | 490 | no |
  | cameras | 517 | yes, 1029 (scrolled to the end, last row clear of the bar) |
  | personen | 272 | no |
  | migrations | 517 | no (bottom-anchored content moved up by 19 px) |

  No page has a last element under the bar.
- [x] 5.3 Run the lint and the production build (`npm run build`, the dev server skips type checking); both succeed
