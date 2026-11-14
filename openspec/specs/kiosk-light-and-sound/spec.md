# kiosk-light-and-sound Specification

## Purpose

Keeps the kiosk lights floor plan focused on lights: its overview tile is named "Licht" and the plan
draws no audio controls, since sound is controlled in the audio plan popup
(capability `kiosk-audio-plan-popup`).

## Requirements

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
