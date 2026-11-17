## Purpose

Sets the height and layout of the switch, multi-state and plan tiles on the kiosk overview, so the
overview leaves room for the audio bar while those tiles stay the most prominent controls on it.

## ADDED Requirements

### Requirement: Compact action tiles on the overview

On the kiosk overview (`/app/kioskoverview`) every switch tile, multi-state tile and plan tile SHALL
be 78 px high (±2 px), a third lower than before (112-118 px), and therefore taller than the 60 px
link tiles. Each such tile SHALL show its round icon on the left and its text to the right of it,
instead of the icon above the text. The icon SHALL be 32 px. The tile text SHALL use 16 px type and
SHALL stay fully readable for the texts the overview uses today, up to three lines; a longer text
SHALL be cut at the tile's bottom edge rather than make the tile taller. The multi-state tile's
list hint in the top right corner, the tile colours, borders and tap behaviour SHALL stay as they
are. Tiles of one row SHALL all have the same height.

#### Scenario: Tile height on the tablet
- **WHEN** the kiosk overview is shown at 1020 × 590 px
- **THEN** every switch, multi-state and plan tile is 78 px high (±2 px)
- **AND** every link tile is 60 px high (±2 px)

#### Scenario: Icon beside the text
- **WHEN** the tile "Rollos Erdgeschoß runter" is shown
- **THEN** its icon is left of its text, and all three lines of the text are visible inside the tile

#### Scenario: Multi-state tile
- **WHEN** the multi-state tile "Rollos 1.Stock" in state "AUTO" is shown
- **THEN** its label and its state are both visible right of the icon
- **AND** the list hint icon is in the tile's top right corner

### Requirement: Other kiosk pages keep their tiles

The switch, multi-state and plan tiles on the other kiosk pages (lights, plugs, presence) SHALL
keep their current size and layout, with the icon above the text.

#### Scenario: Lights page unchanged
- **WHEN** the kiosk lights page is shown
- **THEN** its switch tiles show the icon above the text, at the height they had before this change
