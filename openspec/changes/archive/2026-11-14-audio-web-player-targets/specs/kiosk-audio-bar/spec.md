## MODIFIED Requirements

### Requirement: Target selector opens the audio plan popup

The target selector SHALL show the colour and name of the selected target. Tapping it SHALL open
the audio plan popup (capability `kiosk-audio-plan-popup`), which lists one stream card for the
main group, one for every available solo room and one for every web player, and lets the user
pick one of them as the target. The main group SHALL have its own fixed colour that is distinct
from all room colours; each room SHALL be shown in its `color` from the server. Web players SHALL
share one fixed web player colour that is distinct from the main group colour, the room fallback
colours and the unavailable grey, and SHALL be shown with a web player icon instead of the
speaker or speaker-group icon. A web player SHALL be named by its `name` from the server (the name
MA gives it, which can be changed in MA). Only the main group, rooms that are currently solo and
available, and web players that are currently in the state and available SHALL be selectable as
target. Room volume, group membership, mute and light link SHALL be changed on the popup's floor
plan, not in a list.

A web player is a Music Assistant player that is not configured for any room and that the server
reports in the audio state's `players` list (browser tabs running the MA web UI, the MA mobile app
or the MA PWA). Web players SHALL always be solo targets; the GUI SHALL NOT offer to group them.
When the server sends no `players` list, there SHALL be no web players.

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

#### Scenario: Pick a web player
- **WHEN** the state lists the web player "Web (Firefox on Linux)" and the user taps its stream card in the popup
- **THEN** the bar shows "Web (Firefox on Linux)" with the web player icon in the web player colour
- **AND** play, pause, next, previous, seek, volume, the queue popup and the playlist editor's play button act on that player's `targetId`

#### Scenario: Server without web players
- **WHEN** the server's audio state has no `players` field
- **THEN** the popup shows the main group and the solo rooms only and the bar works as before

### Requirement: Target remembered per device

The selected target SHALL be remembered on the device across page changes and reloads, and SHALL
NOT be shared with other devices. When nothing is remembered, when the remembered room no longer
exists, is grouped again or is not available, the bar SHALL control the main group. When browser
storage is unavailable the bar SHALL still work and default to the main group.

When the remembered target is a web player that is not in the state or not available, the bar
SHALL control the main group without any notice, and a queue popup open for that web player SHALL
switch to the main group's queue. Unlike a room, the remembered web player SHALL be kept: as soon
as a web player with the same `targetId` is in the state and available again, the bar SHALL
control it again. Choosing another target SHALL replace the remembered web player.

#### Scenario: Selection survives a reload
- **WHEN** the user selected the solo room "Küche" and reloads the page
- **THEN** the bar controls "Küche" again

#### Scenario: Remembered room rejoined the group
- **WHEN** the remembered room is put back into the main group (from any device)
- **THEN** the bar switches to the main group

#### Scenario: Storage blocked
- **WHEN** reading or writing browser storage throws
- **THEN** the bar controls the main group and selecting a target still works for the current page session

#### Scenario: Web player tab closed
- **WHEN** the bar controls the web player "Web (Firefox on Linux)" and its browser tab is closed, so the server drops it from `players`
- **THEN** the bar controls the main group and shows its name and colour, without a message
- **AND** a queue popup open at that moment shows the main group's queue

#### Scenario: Web player comes back
- **WHEN** the remembered web player was gone and a web player with the same `targetId` appears in the state again
- **THEN** the bar controls that web player again

#### Scenario: Web player gone at reload
- **WHEN** the remembered target is a web player and the page is reloaded while that player is not in the state
- **THEN** the bar controls the main group and the remembered web player is kept

#### Scenario: Another choice replaces the web player
- **WHEN** the remembered web player is gone, the bar controls the main group and the user taps the main group's card
- **THEN** the main group is remembered and the web player is not selected again when it comes back
