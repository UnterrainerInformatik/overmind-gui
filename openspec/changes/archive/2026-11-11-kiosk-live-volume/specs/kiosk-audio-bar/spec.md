## ADDED Requirements

### Requirement: Live volume while dragging

Every volume slider of the kiosk audio UI - the bar's volume control and each room's slider in
the target popup - SHALL change the volume while it is being dragged, not only when it is
released. While a slider is dragged, the GUI SHALL send the level under the finger to the same
endpoint the slider uses on release (`PUT /audio/targets/{targetId}/volume` for the main group,
`PUT /audio/rooms/{roomId}/volume` for a room), at most one request every 200 ms and with at
most one request of that slider in flight at a time. Levels passed over while a request is in
flight or within the 200 ms SHALL be dropped, except that the newest level SHALL be sent as soon
as both allow it. On release the GUI SHALL make sure the released level is the last level sent
for that slider; it SHALL NOT send it a second time when it already was. The number shown next
to a slider SHALL follow the finger while dragging. After release the slider SHALL keep showing
the released level until the state reports that level for the target or room, or until 3 s have
passed; states reporting other levels in between (echoes of levels sent during the drag) SHALL
NOT move the slider. A failed request for an intermediate level SHALL NOT show a message; a
failed request for the released level SHALL show the usual short error message.

#### Scenario: Volume changes while dragging
- **WHEN** the user presses the bar's volume slider at 20 and slowly drags it to 60 over one second without releasing
- **THEN** the GUI sends several `PUT /audio/targets/{targetId}/volume` requests with rising levels during the drag
- **AND** no two of them start less than 200 ms apart
- **AND** the shown number follows the finger

#### Scenario: Released level is the last one sent
- **WHEN** the user drags a room's slider in the popup quickly from 30 to 75 and releases it at 75
- **THEN** the last `PUT /audio/rooms/{roomId}/volume` sent for that room has `{level: 75}`

#### Scenario: No duplicate on release
- **WHEN** the last level sent during the drag was 50 and the user releases the slider at 50
- **THEN** the GUI sends no further volume request for that slider

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
