## MODIFIED Requirements

### Requirement: Full-screen popup sized for the kiosk tablets

Tapping the audio bar's target selector SHALL open the audio plan popup over the whole viewport.
From top to bottom it SHALL show a tool bar (the six tools and a close control), the floor plan
at the full popup width, and a strip of stream cards filling the remaining height. At 1020 × 590
px all three SHALL be visible without vertical scrolling. The popup SHALL close only through its
close control or the device's back action; a tap elsewhere, including on an error message, SHALL
NOT close it. Each time the popup opens, the Overview tool SHALL be active.

#### Scenario: Kiosk tablet
- **WHEN** the popup is opened at 1020 × 590 px
- **THEN** the tool bar, the whole floor plan and the stream strip are visible without scrolling

#### Scenario: Error message does not close it
- **WHEN** an error message is shown while the popup is open and the user taps the message
- **THEN** the popup stays open

#### Scenario: Reopened on Overview
- **WHEN** the user closes the popup with the Volume tool active and opens it again
- **THEN** the Overview tool is active

### Requirement: One tool is active and decides what a room does

The tool bar SHALL offer Overview, Mute, Group, Light, Volume and Balance, exactly one active at a
time and marked clearly. Tapping a room SHALL do what the active tool does; switching tools SHALL
send nothing.

#### Scenario: Overview highlights the stream
- **WHEN** the Overview tool is active and the user taps the solo room "Kizi Alex"
- **THEN** no request is sent and the stream card of "Kizi Alex" is scrolled into view and highlighted

#### Scenario: Overview on a grouped room
- **WHEN** the Overview tool is active and the user taps a grouped room
- **THEN** the main group's stream card is scrolled into view and highlighted

#### Scenario: Six tools on a phone
- **WHEN** the popup is open at 360 px width
- **THEN** all six tools and the close control fit in the tool bar as icons without horizontal scrolling

## ADDED Requirements

### Requirement: Balance tool sets the levels of a room's speakers

With the Balance tool active, every room whose state reports `balanceSupported: true` and at
least two speakers SHALL be marked with a balance icon; every other room SHALL be dimmed and a
tap on it SHALL send nothing. Tapping a marked, available room SHALL open a balance panel for it
inside the popup, without covering the tool bar or the close control. The panel SHALL show the
room's name and, for each speaker in the server's order, the speaker's name and a slider 0..100
at the level the state reports for it. Dragging a speaker's slider SHALL send that speaker's
level to `PUT /audio/rooms/{roomId}/speakers/{playerId}/volume` with the live-volume rules of
`kiosk-audio-bar` (throttling, released level last, echo handling, error message only for the
released level). A speaker reported unavailable, or with an unknown level, SHALL show a disabled
slider. The panel SHALL follow the state while it is open and SHALL close through its own close
control, when another tool is chosen, when another room is tapped (which opens that room's panel
instead), when the room no longer supports a balance, and when the popup closes. A state without
`speakers` or `balanceSupported` SHALL count as no balance support.

#### Scenario: Stereo pair marked
- **WHEN** the Balance tool is active and "Wohn-Esszimmer" reports `balanceSupported: true` with two speakers, and "Bad" reports `balanceSupported: false`
- **THEN** "Wohn-Esszimmer" shows the balance icon and "Bad" is dimmed

#### Scenario: Open the panel
- **WHEN** the Balance tool is active and the user taps "Wohn-Esszimmer" whose speakers report left 27 and right 30
- **THEN** a panel titled "Wohn-Esszimmer" shows two sliders named as the speakers, at 27 and 30, and no request is sent

#### Scenario: Turn one speaker down
- **WHEN** the user drags the left speaker's slider from 27 to 24 and releases it
- **THEN** the last request sent is `PUT /audio/rooms/{roomId}/speakers/{leftPlayerId}/volume` with `{level: 24}` and no request is sent for the right speaker

#### Scenario: Room without balance
- **WHEN** the Balance tool is active and the user taps "Bad"
- **THEN** no request is sent and no panel opens

#### Scenario: Older server
- **WHEN** the state carries no `speakers` and no `balanceSupported` for any room
- **THEN** every room is dimmed in the Balance tool and no panel can be opened

#### Scenario: Panel closes on tool switch
- **WHEN** the balance panel of "Wohn-Esszimmer" is open and the user chooses the Volume tool
- **THEN** the panel closes and nothing is sent
