## MODIFIED Requirements

### Requirement: Full-screen popup sized for the kiosk tablets

Tapping the audio bar's target selector SHALL open the audio plan popup over the whole viewport.
From top to bottom it SHALL show a tool bar (the seven tools and a close control), the floor plan
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

## ADDED Requirements

### Requirement: The active tool decides what a room does

The tool bar SHALL offer Overview, Group, Volume, Light, Mute, Balance and EQ, in that order,
exactly one active at a time and marked clearly. Tapping a room SHALL do what the active tool
does; switching tools SHALL send nothing. The tool bar SHALL fit without horizontal scrolling at
every popup width from 360 px up.

#### Scenario: Overview highlights the stream
- **WHEN** the Overview tool is active and the user taps the solo room "Kizi Alex"
- **THEN** no request is sent and the stream card of "Kizi Alex" is scrolled into view and highlighted

#### Scenario: Overview on a grouped room
- **WHEN** the Overview tool is active and the user taps a grouped room
- **THEN** the main group's stream card is scrolled into view and highlighted

#### Scenario: Seven tools on a phone
- **WHEN** the popup is open at 360 px width
- **THEN** all seven tools and the close control fit in the tool bar as icons without horizontal scrolling

#### Scenario: Seven tools on a tablet in portrait
- **WHEN** the popup is open at 768 px width
- **THEN** all seven tools and the close control fit in the tool bar without horizontal scrolling

### Requirement: EQ tool sets a room's equaliser or crossover

With the EQ tool active, every room whose state reports `eq` as `bands` or `crossover` SHALL be
marked with an EQ icon. A room reporting `unavailable` SHALL be marked as unreachable and SHALL
still open its panel on a tap. Every other room, including a room whose state has no `eq` field
or an unknown value, SHALL be dimmed, and a tap on it SHALL send nothing. A group room SHALL be
one room with one panel.

Tapping a marked room SHALL open an EQ panel for it inside the popup, without covering the tool
bar or the close control, and SHALL outline the room. On opening, the panel SHALL read the
room's EQ once from `GET /audio/rooms/{roomId}/eq` and SHALL show a progress indicator until the
answer arrives. It SHALL NOT poll. It SHALL read again when an SSE `audio-eq-changed` event names
this room and the change did not come from this panel, after an SSE reconnect, after a `400`
answer, and on *retry*. Events for other rooms SHALL be ignored.

For a **bands** room the panel SHALL show one vertical slider per band the server sends, in the
server's order, with the band's range, step and unit, its current desired gain, and a frequency
label (for example `31.5`, `1.25k`, `16k`). The number of bands and their frequencies SHALL come
from the server. Releasing a slider SHALL send `PUT /audio/rooms/{roomId}/eq` with only the bands
that changed, as `{"bands": {"<frequency>": <gain>}}`. Moving a slider SHALL NOT send anything
before it is released. At most one write per room SHALL be in flight. Changes made meanwhile
SHALL be merged and sent together, with the latest value per band, once the running write ends.

For a **crossover** room the panel SHALL offer *Flat* and each frequency the server lists, with
the desired one selected (`crossover: null` is *Flat*). Choosing one SHALL send
`PUT /audio/rooms/{roomId}/eq` with `{"crossover": <frequency>}`, or `{"crossover": null}` for
*Flat*. The panel SHALL list the room's speakers with their role (satellite or sub) and the
presets each one reports now, and SHALL mark a speaker whose reported presets differ from the
desired crossover.

Both kinds SHALL offer a reset (*Hauskurve* for a bands room, *80 Hz* for a crossover room). The
reset SHALL ask for confirmation inside the panel, then send `POST /audio/rooms/{roomId}/eq/reset`
and, after a `204`, read the EQ again. The panel SHALL show each speaker's address as a detail
line and SHALL say that changes made in a speaker's own web UI are overwritten by the server.

Answers SHALL be handled as follows: `503` SHALL show the server's reason in the panel with
*retry* and disabled controls. `502` on a write SHALL keep the shown values and show a warning
with the reason. `400` SHALL show the reason and read again. `404` or `409` SHALL close the
panel. The panel SHALL close through its own close control, when another tool is chosen, when
another room is tapped (which opens that room's panel instead), when the room's `eq` changes to
anything other than `bands`, `crossover` or `unavailable`, and when the popup closes. When the
room's `eq` changes between `bands`, `crossover` and `unavailable`, an open panel SHALL read the
EQ again.

#### Scenario: Band rooms marked, Cast room dimmed
- **WHEN** the EQ tool is active and the state reports `eq: "bands"` for "Bad" and `eq: "none"` for "Keller/Hauptraum"
- **THEN** "Bad" carries the EQ icon and "Keller/Hauptraum" is dimmed, and tapping "Keller/Hauptraum" sends nothing

#### Scenario: Older server
- **WHEN** the EQ tool is active and the state's rooms carry no `eq` field
- **THEN** every room is dimmed and no tap opens a panel

#### Scenario: Bands built from the server
- **WHEN** the user taps "Bad" and `GET /audio/rooms/12/eq` answers with 15 bands from 20 Hz to 16 kHz, −15…+15 dB, step 1
- **THEN** a progress indicator shows until the answer arrives, then 15 vertical sliders labelled `20` … `16k` at the desired gains

#### Scenario: Only the released band is sent
- **WHEN** the user drags the 80 Hz slider from 3 to 5 and releases it
- **THEN** nothing is sent while dragging and one `PUT /audio/rooms/12/eq` with `{"bands": {"80": 5}}` is sent on release

#### Scenario: Changes during a running write are merged
- **WHEN** a write for 80 Hz is in flight and the user releases 125 Hz at 4 and then 200 Hz at 2
- **THEN** after the first write ends exactly one more `PUT` is sent with `{"bands": {"125": 4, "200": 2}}`

#### Scenario: Crossover room
- **WHEN** the user taps "Wohn-Esszimmer" and the EQ answers `capability: "crossover"`, `crossover: 80` and one satellite reports `HF 90Hz`
- **THEN** the panel shows *Flat* and 60 … 150 with 80 selected, lists both satellites and the sub with their roles and presets, and marks the satellite at `HF 90Hz`

#### Scenario: Choosing Flat
- **WHEN** the user chooses *Flat* in the crossover panel
- **THEN** `PUT /audio/rooms/13/eq` is sent with `{"crossover": null}`

#### Scenario: Reset asks first
- **WHEN** the user taps *Hauskurve* in the "Bad" panel
- **THEN** nothing is sent until the user confirms in the panel, then `POST /audio/rooms/12/eq/reset` is sent and the EQ is read again after the `204`

#### Scenario: Speaker does not answer
- **WHEN** `GET /audio/rooms/12/eq` answers `503` with reason `10.10.195.67 did not answer`
- **THEN** the panel shows that reason, its controls are disabled, and *retry* reads the EQ again

#### Scenario: Write partly failed
- **WHEN** a `PUT` answers `502` with a reason
- **THEN** the sliders keep the sent values and a warning with the reason is shown

#### Scenario: Change from another kiosk
- **WHEN** the "Bad" panel is open, no write of its own is running, and an SSE `audio-eq-changed` with `roomId: 12` arrives
- **THEN** the panel reads `GET /audio/rooms/12/eq` again and shows the new gains

#### Scenario: Event for another room
- **WHEN** the "Bad" panel is open and an SSE `audio-eq-changed` with `roomId: 13` arrives
- **THEN** nothing is read

#### Scenario: Tool switch closes the panel
- **WHEN** the "Bad" EQ panel is open and the user chooses the Volume tool
- **THEN** the panel closes

## REMOVED Requirements

### Requirement: One tool is active and decides what a room does

**Reason**: Its scenario names a fixed tool count ("Six tools on a phone"), which a seventh tool makes wrong.
**Migration**: Replaced by "The active tool decides what a room does" with the same behaviour, seven tools, and the tool bar fitting at every width from 360 px.
