# kiosk-weather-panel Specification

## Purpose

The kiosk weather (zamg) panel shows the current outdoor observation next to the
indoor temperature and tells the viewer when that observation has gone stale.

## Requirements

### Requirement: Stale weather data is flagged

The weather panel SHALL compute the age of the observation as the difference
between the current time and the record's `measuredOn` instant. When the age is
greater than 30 minutes the panel SHALL be in the stale state: its border SHALL
be red and it SHALL show the line "Veraltet seit HH:MM" (en: "Stale since
HH:MM") in red, where HH:MM is `measuredOn` in local time. An age of exactly 30
minutes or less SHALL count as fresh.

#### Scenario: Fresh observation
- **WHEN** `measuredOn` is 12 minutes before the current time
- **THEN** the panel shows its normal border and no stale line

#### Scenario: Observation older than 30 minutes
- **WHEN** `measuredOn` is 31 minutes before the current time
- **THEN** the panel border is red and the panel shows "Veraltet seit" followed by the local time of `measuredOn`

#### Scenario: Exactly at the threshold
- **WHEN** `measuredOn` is exactly 30 minutes before the current time
- **THEN** the panel is fresh

### Requirement: Staleness is re-evaluated without new data

The panel SHALL re-evaluate freshness on a clock tick of at most 30 seconds,
independent of whether a fetch succeeds or returns a new record, so that a
feed which stops updating turns stale on its own.

#### Scenario: Feed stops delivering
- **WHEN** the panel last received a record with `measuredOn` 25 minutes ago and every later fetch returns the same record or fails
- **THEN** the panel turns stale within 30 seconds after the age passes 30 minutes, without a reload

#### Scenario: Feed recovers
- **WHEN** the panel is stale and a fetch returns a record whose `measuredOn` is fresh
- **THEN** the panel returns to its normal look on that update

### Requirement: Unknown freshness is not flagged

When `measuredOn` is absent, empty, or not a parsable instant, freshness SHALL
be unknown. In the unknown state the panel SHALL look exactly as in the fresh
state but without a "Stand" line, and SHALL NOT show a stale indication.

#### Scenario: Server without freshness fields
- **WHEN** the record has no `measuredOn` field
- **THEN** the panel shows its normal border, no stale line, and no "Stand" line

#### Scenario: Unparsable timestamp
- **WHEN** `measuredOn` is `"garbage"`
- **THEN** the panel treats freshness as unknown

### Requirement: Observation time is shown

While the observation is fresh the panel SHALL show a small line "Stand HH:MM"
(en: "As of HH:MM") with `measuredOn` in local time. The panel SHALL keep its
fixed kiosk footprint (230 px wide, content no taller than before) with the
added line.

#### Scenario: Fresh record shows its time
- **WHEN** `measuredOn` is `2026-11-18T06:10:00Z` and the kiosk runs in Europe/Vienna and the observation is fresh
- **THEN** the panel shows "Stand 07:10"

#### Scenario: Footprint unchanged
- **WHEN** the panel renders a fresh record on the kiosk overview
- **THEN** its outer size is unchanged compared to before this change and no content is clipped

### Requirement: Absent values render as a dash

Any value of the record (`sun`, `rain`, `wind`, `humidity`, `radiation`,
`temperature`, ...) MAY be absent. An absent or non-numeric value SHALL be
rendered as "–" without its unit, and the rest of the panel SHALL render
normally. The felt temperature SHALL be computed with missing wind treated as
0 km/h and missing humidity treated as 0 %.

#### Scenario: Wind missing
- **WHEN** the record has no `wind` field
- **THEN** the wind value reads "–", the felt-temperature tile still shows a number, and the sunshine and rain values render normally

#### Scenario: Several values missing
- **WHEN** the record has neither `sun` nor `rain`
- **THEN** both read "–" and no value reads `NaN`

### Requirement: Rain shows the last hour and an active-rain indicator

The rain value SHALL show `rainLastHour` (rain summed over the last hour, mm)
with one decimal. When `rainLastHour` is absent or non-numeric it SHALL fall
back to `rain` (last 10 minutes); when both are absent it SHALL read "–".
When `rainDuration` is a number greater than 0 the rain icon and value SHALL be
shown in light blue (raining now), regardless of the mm amount; otherwise, or
when `rainDuration` is absent, they SHALL be shown white as before.

#### Scenario: Drizzle with zero amount
- **WHEN** the record has `rain` 0.0, `rainLastHour` 0.0 and `rainDuration` 100
- **THEN** the rain value reads "0 mm" and icon and value are light blue

#### Scenario: Hourly sum preferred
- **WHEN** the record has `rain` 0.1 and `rainLastHour` 1.4
- **THEN** the rain value reads "1.4 mm"

#### Scenario: Hourly sum missing
- **WHEN** the record has `rain` 0.3 and no `rainLastHour`
- **THEN** the rain value reads "0.3 mm"

#### Scenario: Dry
- **WHEN** `rainDuration` is 0 or absent
- **THEN** the rain icon and value are white

### Requirement: Sunshine value is labelled as duration

The `sun` value SHALL be labelled as sunshine duration ("Sonnenschein" / "Sunshine")
and SHALL NOT be labelled as irradiance. The label SHALL be available as the
value's title.

#### Scenario: Sunshine title
- **WHEN** the viewer hovers the sunshine value in the de-AT locale
- **THEN** its title reads "Sonnenschein"
