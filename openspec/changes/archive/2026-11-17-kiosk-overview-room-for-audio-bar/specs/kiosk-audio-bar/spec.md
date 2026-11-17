## MODIFIED Requirements

### Requirement: Lower link tiles and bar height

Every kiosk link tile SHALL be 60 px high (it was 82 px before change `kiosk-audio-bar`), with its
icon placed beside the text instead of above it, and its text still readable on one line where it
fit before. The audio bar SHALL be 60 px high, as high as a link tile (it was 41 px before change
`kiosk-overview-room-for-audio-bar`), on every screen width.

#### Scenario: Link tile height lowered
- **WHEN** any kiosk page with link tiles is shown at the same width as before
- **THEN** each link tile is 60 px high (±2 px)
- **AND** the audio bar is 60 px high (±2 px)

#### Scenario: Overview still fits the tablet
- **WHEN** the kiosk overview is shown at 1020 × 590 px
- **THEN** the last row of link tiles ends above the audio bar
- **AND** the page does not scroll

### Requirement: Size of the bar's volume slider

The vertical volume slider in the bar's volume menu SHALL be 300 px long, or as long as fits when
the viewport is less than 429 px high (viewport height minus 129 px), so the menu stays fully
visible above the 60 px bar. Its track SHALL be 3 px and its thumb 18 px wide, 1.5 times Vuetify's
default vertical slider, and the slider 36 px wide.

#### Scenario: Tablet
- **WHEN** the user opens the volume menu on a 1024 × 768 screen
- **THEN** the slider is 300 px long and 36 px wide, with a 3 px track and an 18 px thumb

#### Scenario: Phone landscape
- **WHEN** the user opens the volume menu on an 844 × 390 screen
- **THEN** the slider is 261 px long and the whole menu is visible above the bar

## ADDED Requirements

### Requirement: Size of the bar's buttons

Every icon button of the bar (previous, back, play/pause, forward, next, shuffle, volume, radio,
audiobooks) SHALL fill the bar's full height. Its width SHALL be 56 px from 960 px viewport width
up, 44 px from 600 px up to 960 px, and 36 px below 600 px. Its icon SHALL be 28 px from 600 px
viewport width up and 24 px below. The bar SHALL still fit the viewport width without horizontal
scrolling (requirement "Usable on tablet, mobile and PC widths"); the title and the progress slider
SHALL give up width before any button does.

#### Scenario: Tablet
- **WHEN** the kiosk is shown at 1020 × 590 px
- **THEN** each icon button of the bar is 56 px wide and 60 px high (±2 px) with a 28 px icon
- **AND** the bar has no horizontal scroll

#### Scenario: Small tablet
- **WHEN** the kiosk is shown at 800 px width
- **THEN** each icon button of the bar is 44 px wide
- **AND** the bar has no horizontal scroll and still shows the shuffle toggle

#### Scenario: Phone
- **WHEN** the kiosk is shown at 390 px width
- **THEN** each icon button of the bar is 36 px wide
- **AND** the bar has no horizontal scroll

### Requirement: Two-line target selector

From 600 px viewport width up, the target selector SHALL show the target's colour dot and icon on
the first line and the target's name on a second line below them, in a smaller type, cut with an
ellipsis when it does not fit. The selector SHALL be at most 88 px wide. Below 600 px it SHALL
show only the dot and the icon, as before. Tapping anywhere on the selector SHALL open the audio
plan popup, as before.

#### Scenario: Name under the dot
- **WHEN** the main group "Haus" is the target and the kiosk is shown at 1020 px width
- **THEN** the selector shows the dot and the icon, and "Haus" below them
- **AND** the selector is at most 88 px wide

#### Scenario: Long room name
- **WHEN** a room called "Elternschlafzimmer" is the target
- **THEN** its name is cut with an ellipsis and the selector stays at most 88 px wide

### Requirement: Volume slider contrast

The bar's volume slider SHALL use the same colours as the volume sliders of the stream cards and
the balance panel: `#4FC3F7` for the filled part and the thumb on the dark theme, `#1976D2` on the
light theme, and a track of `rgba(255,255,255,0.35)` on the dark theme and `rgba(0,0,0,0.3)` on the
light theme. The number below the slider SHALL be shown at full text opacity.

#### Scenario: Dark theme
- **WHEN** the user opens the bar's volume menu on the dark theme
- **THEN** the slider's filled part and thumb are `rgb(79, 195, 247)`
- **AND** its unfilled track is white at 35 % opacity

#### Scenario: Light theme
- **WHEN** the user opens the bar's volume menu on the light theme
- **THEN** the slider's filled part and thumb are `rgb(25, 118, 210)`
