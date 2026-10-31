## MODIFIED Requirements

### Requirement: Radio quick select popup

Tapping the radio button SHALL open a popup with the stations from `GET /audio/radio` (at most 12,
in server order), each with its name and image when present. When the server sends more than 12
stations, the popup SHALL show the first 12 and drop the rest. On the kiosk display the popup
SHALL show twelve stations without scrolling. Tapping a station SHALL play it on the selected
target via `playMedia` with the station's URI and close the popup. When the server returns no
stations, the popup SHALL say that no stations are configured.

#### Scenario: Play a station
- **WHEN** the user opens the radio popup and taps "Ö1"
- **THEN** the GUI sends `POST /audio/targets/{targetId}/playMedia` with Ö1's URI
- **AND** the popup closes

#### Scenario: Twelve stations
- **WHEN** `GET /audio/radio` answers 13 stations
- **THEN** the popup shows the first 12 in server order
- **AND** the 13th station is not shown

#### Scenario: Twelve stations fit on the kiosk display
- **WHEN** the popup shows 12 stations on the kiosk display
- **THEN** all 12 tiles are fully visible without scrolling the popup

#### Scenario: No stations
- **WHEN** `GET /audio/radio` answers an empty list
- **THEN** the popup shows that no radio stations are configured
