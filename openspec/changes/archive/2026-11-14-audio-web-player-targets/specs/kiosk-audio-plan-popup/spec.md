## MODIFIED Requirements

### Requirement: One card per stream

The stream strip SHALL show one card for the main group first, then one card for every
available solo room, and then one card for every available web player (capability
`kiosk-audio-bar`), each in its stream's colour. A web player's card SHALL show the web player
icon instead of the speaker icon and the web player's name from the server. A card SHALL show
cover, title and artist (or a "nothing playing" text), previous / play-pause / next, and a volume
slider for the stream's volume (`PUT /audio/targets/{targetId}/volume`), live while dragged as in
`kiosk-audio-bar`. A solo room's or web player's card for a target with nothing to play SHALL be
narrower, with its name and a hint that a selection can be started from the bar. The card of the
bar's current target SHALL be marked as selected. Tapping a card outside its controls SHALL
select it as the bar's target and close the popup. When the cards do not fit the width, the strip
SHALL scroll horizontally on its own, without the page scrolling sideways. A card SHALL appear
and disappear with its web player while the popup is open, as the audio state changes.

#### Scenario: Pick a solo stream
- **WHEN** the user taps the card of the solo room "Atrium" outside its controls
- **THEN** the bar controls "Atrium" and the popup closes

#### Scenario: Group volume
- **WHEN** the user drags the main group card's volume slider to 40 and releases it
- **THEN** the last request sent is `PUT /audio/targets/{mainGroup.targetId}/volume` with `{level: 40}`

#### Scenario: Pause a solo stream
- **WHEN** the solo room "Workshop" is playing and the user taps pause on its card
- **THEN** the GUI sends `POST /audio/targets/{targetId}/pause` for Workshop and the popup stays open

#### Scenario: Web player cards after the rooms
- **WHEN** the state has the solo rooms "Atrium" and "Workshop" and the web players "Web (Firefox on Linux)" and "Web (Chrome on Windows)"
- **THEN** the strip shows the main group, "Atrium", "Workshop", then the two web player cards with the web player icon in the web player colour

#### Scenario: Web player appears while open
- **WHEN** the popup is open and a browser opens the MA web UI, so the server adds a web player to the state
- **THEN** a card for that web player appears at the end of the strip

#### Scenario: Web player volume
- **WHEN** the user drags a web player card's volume slider to 30 and releases it
- **THEN** the last request sent is `PUT /audio/targets/{targetId}/volume` with `{level: 30}` for that web player's `targetId`

## ADDED Requirements

### Requirement: Web players are not on the plan

Web players SHALL NOT be drawn on the floor plan, not be shown as room chips beside it, and not be
affected by the mute, group, light or volume tools, because they belong to no room. They SHALL be
reachable only through their stream cards.

#### Scenario: No area for a web player
- **WHEN** the state lists a web player
- **THEN** the plan shows no area and no chip for it, and the Group tool cannot put it into the main group
