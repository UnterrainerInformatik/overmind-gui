## ADDED Requirements

### Requirement: Colours for filters and albums in the search

The library search SHALL show two distinct colours, both readable in the light and the dark theme.
The **filter colour** SHALL mark the search field at all times (empty, filled, focused or not),
every artist result row and the artist chip of an artist drill-in. The **album colour** SHALL
mark every album result row and the chip of an opened album. The two colours SHALL differ from
each other. Track rows SHALL NOT carry either colour. A coloured row SHALL keep its cover, title
and text readable, and the existing marks for added, busy and currently previewed rows SHALL stay
visible.

#### Scenario: Search field in the filter colour
- **WHEN** the search of an editable playlist is shown with an empty field
- **THEN** the field's border, label and search icon are in the filter colour

#### Scenario: Focused search field
- **WHEN** the user taps into the search field
- **THEN** the field stays in the filter colour instead of the theme's primary colour

#### Scenario: Artist and album results
- **WHEN** a search returns tracks, albums and artists
- **THEN** the artist rows are marked in the filter colour, the album rows in the album colour and the track rows in neither

#### Scenario: Artist chip
- **WHEN** the user drills into the artist "The Beatles"
- **THEN** the chip "The Beatles" is in the filter colour

#### Scenario: Album chip
- **WHEN** the user opens the album "Abbey Road"
- **THEN** the chip "Abbey Road" is in the album colour

#### Scenario: Dark theme
- **WHEN** the kiosk uses the dark theme
- **THEN** both colours are shown in their dark-theme variant and stay distinct from each other
