## Context

The temperature color scale in `src/utils/overmindUtils.ts` is built from three index-aligned arrays:

- `tempBoundaries` — ascending temperature anchors.
- `tempRawColorsLerpable` — one color per anchor plus one trailing "above the top boundary" color (length = boundaries + 1).
- `tempRawColors` — the same colors as display strings (commented-out preview only).

`calculateTemperatureIndex(temp)` returns the index of the first boundary the temperature is below, clamping to `boundaries.length` for anything above the top boundary. `getTempColorFor(temp)` interpolates linearly between the two color anchors bracketing the temperature; for the clamped top bucket there is no next anchor, so `p` snaps to the edge and the solid trailing color is used.

Before this change the upper end was: orange@30 → red@36 → solid white above 36, which made everything ≥36 °C indistinguishable.

## Goals / Non-Goals

**Goals:**
- Keep the color scale meaningful up to 50 °C.
- Hot-red at 40 °C, red→white across 40–50 °C, black above 50 °C.
- Preserve the existing index-clamping safety so no array overflows (regression guard from commit 9b46908).

**Non-Goals:**
- No change to the sub-30 °C portion of the scale.
- No change to the felt-temperature / heat-index math in `KioskZamgPanel.vue`.
- No new theming/configuration surface — the scale stays hard-coded.

## Decisions

**Move anchors instead of rescaling.** Change `tempBoundaries` from `[…, 30, 36]` to `[…, 30, 40, 50]` and append a black color. This keeps the red anchor (`[200,0,0]`) at the new 40 °C position, places white (`[255,255,255]`) at 50 °C, and makes the trailing clamp color black (`[0,0,0]`). Rationale: the existing interpolation/clamping logic already does exactly what we need once the anchors move — no algorithm change required, lowest-risk edit.

*Alternative considered:* introduce a configurable palette. Rejected — over-engineered for a fixed kiosk display.

**Black as the off-scale color.** Above 50 °C is treated as off-scale / fault-like and rendered black rather than continuing a gradient. Rationale: a realistic outdoor sensor reading above 50 °C usually means direct sun or a fault; a stark black readout is an intentional visual alarm.

**Add `tempDesc9` rather than reusing `tempDesc8`.** The new black bucket gets its own localized description (`glühend heiß` / `scorching hot`); `tempDesc8` continues to describe the 40–50 °C white band (`extrem heiß` / `extremely hot`).

## Risks / Trade-offs

- [Index overflow if arrays drift out of sync] → Color arrays are length 10 and `tempDesc0..9` exist in both locales; `calculateTemperatureIndex` clamps to `boundaries.length` (9), which is a valid index in all three. Covered by the spec's bounds requirement.
- [Black readout misread as "no data"] → Accepted; above 50 °C is rare and the alarm semantics are intended. The panel still shows the numeric value alongside the color.
- [Other consumers of `getTempColorFor` (Floorplan)] → They share the same scale, which is desirable; behavior below 30 °C is unchanged so existing displays are unaffected.

## Migration Plan

Pure front-end constant change; no data migration. Already shipped in commit `ab8b820`. Rollback is a straight revert of that commit.
