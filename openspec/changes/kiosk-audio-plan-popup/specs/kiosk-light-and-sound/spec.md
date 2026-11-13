## ADDED Requirements

### Requirement: The lights tile is named "Licht" and the lights plan has no audio

The overview link tile that opens the lights floor plan SHALL read "Licht" (de-AT) and "Lights"
(en-US) again and SHALL keep opening `/app/kiosklights`. The lights floor plan SHALL draw no
audio controls; sound is controlled in the audio plan popup (capability
`kiosk-audio-plan-popup`).

#### Scenario: Tile label and route
- **WHEN** the user opens the kiosk overview in German
- **THEN** a link tile reads "Licht"
- **AND** tapping it opens `/app/kiosklights`

#### Scenario: No audio on the lights plan
- **WHEN** the lights floor plan is shown and the audio state lists rooms
- **THEN** no audio button is drawn on it and every light icon works as before

## REMOVED Requirements

### Requirement: The lights tile is named "Licht & Sound"
**Reason**: The lights plan carries no sound any more.
**Migration**: Replaced by "The lights tile is named \"Licht\" and the lights plan has no audio".

### Requirement: Audio rooms are drawn from the server state
**Reason**: The server never got room button coordinates, and sound moves into the audio plan popup.
**Migration**: Rooms are drawn from their lights in `kiosk-audio-plan-popup`; `buttonX`/`buttonY` are no longer read.

### Requirement: Group toggle per room
**Reason**: Moved to the audio plan popup.
**Migration**: Use the Group tool of `kiosk-audio-plan-popup`.

### Requirement: Light link per room
**Reason**: Moved to the audio plan popup.
**Migration**: Use the Light tool of `kiosk-audio-plan-popup`.

### Requirement: Buttons show the server's state, not the tap
**Reason**: The buttons are gone.
**Migration**: The same rule is "The server's state is shown, not the tap" in `kiosk-audio-plan-popup`.

### Requirement: Unavailable speakers and unavailable audio
**Reason**: The buttons are gone.
**Migration**: Unavailable speakers and audio are covered in `kiosk-audio-plan-popup`.
