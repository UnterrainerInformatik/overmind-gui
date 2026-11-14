## ADDED Requirements

### Requirement: Queue popup layout

At widths of 960 px and more, the queue and playlist popup SHALL show the queue and the playlist
section side by side, the queue on the left and the playlist section on the right, each in its
own column that scrolls on its own. The playlist section's head (heading and shuffle toggle) and
its filter field SHALL stay visible at the top of their column while the playlist list scrolls.
Below 960 px, the popup SHALL show the queue first and the playlist section below it in one
scrolling list. At 390, 800 and 1280 px width the popup SHALL have no horizontal scrolling.

#### Scenario: Wide layout
- **WHEN** the popup is opened at 1280 px width with a queue of 40 entries and 20 playlists
- **THEN** the queue and the playlist list are visible next to each other, the queue on the left

#### Scenario: Columns scroll on their own
- **WHEN** the popup is open at 1280 px width and the user scrolls the queue to its end
- **THEN** the playlist column does not move

#### Scenario: Playlist head stays visible
- **WHEN** the popup is open at 1280 px width and the user scrolls the playlist list down
- **THEN** the shuffle toggle and the filter field stay visible above the list

#### Scenario: Narrow layout
- **WHEN** the popup is opened at 800 px width
- **THEN** the playlist section is shown below the queue in one scrolling list

#### Scenario: Phone width
- **WHEN** the popup is opened at 390 px width
- **THEN** it shows the queue with the playlist section below and has no horizontal scrolling
