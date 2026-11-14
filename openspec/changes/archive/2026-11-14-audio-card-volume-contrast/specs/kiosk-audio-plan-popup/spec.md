## ADDED Requirements

### Requirement: Card volume slider stands out from the card

The volume slider on every stream card SHALL be clearly visible against the card in both the dark
and the light theme: the filled part of the track and the thumb SHALL have a contrast ratio of at
least 3:1 against the card's background, and the unfilled part of the track SHALL stay visible
and distinguishable from the filled part. The slider's colour SHALL be the same on every card and
SHALL NOT depend on the stream's colour. A disabled slider (disabled card or unknown volume) MAY
stay dimmed.

#### Scenario: Dark theme
- **WHEN** the plan popup is open in the dark theme and the main group's volume is 40
- **THEN** the filled track up to 40 and the round thumb are drawn in a light colour with at least 3:1 contrast against the card, and the rest of the track is visible as a fainter line

#### Scenario: Light theme
- **WHEN** the plan popup is open in the light theme
- **THEN** the filled track and the thumb are drawn in a dark colour with at least 3:1 contrast against the card

#### Scenario: Same colour on every card
- **WHEN** the strip shows the main group card and a solo room card in a different stream colour
- **THEN** both cards' volume sliders use the same colour
