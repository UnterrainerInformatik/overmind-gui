## Purpose

Puts each audio room's two room-level switches (in or out of the main group, and whether the
music follows the room's lights) on the lights floor plan, so a room's sound is changed in the
same place as its lights.

## ADDED Requirements

### Requirement: The lights tile is named "Licht & Sound"

The overview link tile that opens the lights floor plan SHALL read "Licht & Sound" (de-AT) and
"Lights & Sound" (en-US) and SHALL keep opening `/app/kiosklights`.

#### Scenario: Tile label and route
- **WHEN** the user opens the kiosk overview in German
- **THEN** a link tile reads "Licht & Sound"
- **AND** tapping it opens `/app/kiosklights`

### Requirement: Audio rooms are drawn from the server state

On the lights floor plan, the GUI SHALL draw one button pair for every room in the current audio
state that has both a horizontal and a vertical button coordinate. The coordinates are in
floor-plan image pixels, the same system as the plan's light icons, and SHALL follow the plan's
scaling when the viewport changes. A room without both coordinates SHALL NOT be drawn. The view
SHALL NOT contain any room, speaker or position of its own. When the audio state changes (room
added, removed, moved, renamed, flags changed), the buttons SHALL follow without a page reload.

#### Scenario: Rooms with coordinates
- **WHEN** the audio state lists three rooms and two of them have button coordinates
- **THEN** exactly two button pairs are drawn, each at its room's coordinates

#### Scenario: Plan scales
- **WHEN** the viewport width changes so that the floor plan is drawn at half its image size
- **THEN** each button pair moves to half its coordinates, staying over the same spot of the plan

#### Scenario: Room added on the server
- **WHEN** an `audio-state` event arrives with an additional room that has coordinates
- **THEN** its button pair appears without a reload

### Requirement: Group toggle per room

Each drawn room SHALL have a group button showing whether the room is in the main group or
playing on its own. Tapping it SHALL ask the server to move the room out of the main group when
it is in, and back in when it is out. The pinned room's group button SHALL show a pinned,
always-in-group look and SHALL NOT send anything when tapped.

#### Scenario: Take a room out
- **WHEN** the user taps the group button of a grouped, unpinned, available room
- **THEN** the GUI asks the server to set that room to not grouped

#### Scenario: Put a room back
- **WHEN** the user taps the group button of a solo, available room
- **THEN** the GUI asks the server to set that room to grouped

#### Scenario: Pinned room
- **WHEN** the user taps the group button of the pinned room
- **THEN** no request is sent and the button keeps its pinned look

### Requirement: Light link per room

Each drawn room SHALL have a light-link button ("Licht verknüpft") showing whether the room's
speaker follows the room's lights. Tapping it SHALL ask the server to flip the room's light-link
flag. The GUI SHALL NOT mute, unmute or otherwise act on the speaker itself. Muting from the
lights is the server's job.

#### Scenario: Turn the link on
- **WHEN** the user taps the light-link button of an unlinked, available room
- **THEN** the GUI asks the server to set that room's light link to on

#### Scenario: Turn the link off
- **WHEN** the user taps the light-link button of a linked room
- **THEN** the GUI asks the server to set that room's light link to off

### Requirement: Buttons show the server's state, not the tap

The buttons SHALL show the state the server reports, not the state the user last tapped. While a
request for a button is in flight, that button SHALL NOT accept another tap. When a request
fails, the GUI SHALL show one error message, the same as for the audio bar's commands, and the
button SHALL keep showing the server's state.

#### Scenario: Success arrives by push
- **WHEN** the user takes a room out and the server then pushes a state with the room not grouped
- **THEN** the group button shows the room as out of the group

#### Scenario: Request fails
- **WHEN** the server answers a group-toggle request with an error
- **THEN** one error message is shown and the button still shows the room as in the group

#### Scenario: Double tap
- **WHEN** the user taps a button twice before the first request has answered
- **THEN** only one request is sent

### Requirement: Unavailable speakers and unavailable audio

When a room's speaker is reported unavailable, both of its buttons SHALL be drawn dimmed and
SHALL NOT send requests. When no audio state could be loaded at all, the floor plan SHALL show no
audio buttons, and the lights on it SHALL behave exactly as without this change.

#### Scenario: Speaker offline
- **WHEN** a drawn room's speaker is reported unavailable
- **THEN** both of its buttons are dimmed and tapping them sends nothing

#### Scenario: Backend without audio
- **WHEN** the audio state cannot be loaded
- **THEN** no audio buttons are drawn and every light icon on the plan works as before
