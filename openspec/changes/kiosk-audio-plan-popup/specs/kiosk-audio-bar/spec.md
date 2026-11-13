## ADDED Requirements

### Requirement: Target selector opens the audio plan popup

The target selector SHALL show the colour and name of the selected target. Tapping it SHALL open
the audio plan popup (capability `kiosk-audio-plan-popup`), which lists one stream card for the
main group and one for every available solo room and lets the user pick one of them as the
target. The main group SHALL have its own fixed colour that is distinct from all room colours;
each room SHALL be shown in its `color` from the server. Only the main group and rooms that are
currently solo and available SHALL be selectable as target. Room volume, group membership, mute
and light link SHALL be changed on the popup's floor plan, not in a list.

#### Scenario: Pick a solo room
- **WHEN** the room "Küche" is solo and available and the user taps its stream card in the popup
- **THEN** the bar shows "Küche" in Küche's colour
- **AND** following commands go to Küche's `targetId`

#### Scenario: Grouped room is not a target
- **WHEN** the room "Bad" is grouped
- **THEN** the popup shows no stream card for "Bad" and "Bad" is filled in the main group's colour on the plan

#### Scenario: Main group colour is distinct
- **WHEN** the selected target is the main group
- **THEN** the bar shows the main group's colour, which differs from every room colour in the state

## MODIFIED Requirements

### Requirement: Live volume while dragging

Every volume control of the kiosk audio UI - the bar's volume slider, the stream cards' volume
sliders and the Volume tool's room drag in the audio plan popup - SHALL change the volume while
it is being dragged, not only when it is released. While a control is dragged, the GUI SHALL
send the level under the finger to the same endpoint the control uses on release
(`PUT /audio/targets/{targetId}/volume` for the bar and the stream cards,
`PUT /audio/rooms/{roomId}/volume` for a room on the plan), at most one request every 200 ms and
with at most one request of that control in flight at a time. Levels passed over while a request
is in flight or within the 200 ms SHALL be dropped, except that the newest level SHALL be sent as
soon as both allow it. On release the GUI SHALL make sure the released level is the last level
sent for that control; it SHALL NOT send it a second time when it already was. The number shown
for a control SHALL follow the finger while dragging. After release the control SHALL keep
showing the released level until the state reports that level for the target or room, or until
3 s have passed; states reporting other levels in between (echoes of levels sent during the drag)
SHALL NOT move it. A failed request for an intermediate level SHALL NOT show a message; a failed
request for the released level SHALL show the usual short error message.

#### Scenario: Volume changes while dragging
- **WHEN** the user presses the bar's volume slider at 20 and slowly drags it to 60 over one second without releasing
- **THEN** the GUI sends several `PUT /audio/targets/{targetId}/volume` requests with rising levels during the drag
- **AND** no two of them start less than 200 ms apart
- **AND** the shown number follows the finger

#### Scenario: Released level is the last one sent
- **WHEN** the user drags a room on the plan with the Volume tool quickly from 30 to 75 and releases it at 75
- **THEN** the last `PUT /audio/rooms/{roomId}/volume` sent for that room has `{level: 75}`

#### Scenario: No duplicate on release
- **WHEN** the last level sent during the drag was 50 and the user releases the control at 50
- **THEN** the GUI sends no further volume request for that control

#### Scenario: Echo of an intermediate level
- **WHEN** the user released the bar's volume slider at 70 and a state then arrives reporting volume 55 from an earlier request of the drag
- **THEN** the slider keeps showing 70
- **AND** it shows the state's volume again once a state reports 70 or 3 s have passed

#### Scenario: Tap without dragging
- **WHEN** the user taps the bar's volume slider at 40 without dragging
- **THEN** the GUI sends one volume request with `{level: 40}`

#### Scenario: Intermediate request fails
- **WHEN** a volume request sent during a drag answers with an error and the request for the released level succeeds
- **THEN** no error message is shown

### Requirement: Usable on tablet, mobile and PC widths

The bar SHALL fit the viewport width without horizontal scrolling on tablet, mobile and PC
widths. On narrow widths (below 600 px) the ±10 s buttons and previous track SHALL be omitted and the title SHALL
be truncated with an ellipsis; target selector, play/pause, next, progress slider, volume and radio
SHALL remain available. The popups SHALL fit the viewport on every width and be closable with an
explicit close control. On widths below 1020 px the audio plan popup SHALL scale its floor plan
down to the viewport width and MAY scroll vertically, but SHALL NOT scroll the page sideways.

#### Scenario: Phone width
- **WHEN** the kiosk is shown at 390 px width
- **THEN** the bar has no horizontal scroll and shows target, title, play/pause, next, slider, volume and radio

#### Scenario: Popup on phone
- **WHEN** the audio plan popup is opened at 390 px width
- **THEN** the floor plan is 390 px wide, the page has no horizontal scroll, and the popup can be closed with its close control

## REMOVED Requirements

### Requirement: Target selector with room colours, room volume and group toggle
**Reason**: The list popup with room sliders and group switches is replaced by the full-screen audio plan popup.
**Migration**: "Target selector opens the audio plan popup" in this capability; room volume, group, mute and light link are tools of `kiosk-audio-plan-popup`.
