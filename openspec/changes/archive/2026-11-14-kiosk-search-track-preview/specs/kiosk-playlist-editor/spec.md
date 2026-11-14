## ADDED Requirements

### Requirement: Preview search tracks

Every track in the library search results SHALL have a play/stop button for the device's audio
target, the same target that the editor's play button uses. The track that target is currently
on SHALL be marked: its `playback.track.uri` equals the result's URI, whether the target plays or
is paused. The button of the marked track SHALL show stop while the target plays, and play
otherwise. Every other result SHALL show play.

- Play on a track that is not the target's current track SHALL send
  `POST /audio/targets/{targetId}/playMedia` with `{uri: <the track's uri>}` and no `shuffle`.
  This replaces the target's queue with that one track, so nothing plays after it.
- Play on the marked, paused track SHALL resume it (`audioTargetCommand` `play`).
- Stop SHALL pause the target (`audioTargetCommand` `pause`).

While a track is marked and the target reports a duration, its row SHALL show a position slider
that behaves like the audio bar's seek slider: the position is interpolated locally, dragging
does not move it back, and releasing seeks the target (`audioTargetSeek`). Tapping the button or
the slider SHALL NOT add the track; tapping the rest of the row SHALL still add it as before.
When no target is known (audio state not loaded), the preview buttons SHALL be disabled. A failed
preview command SHALL show a snackbar.

#### Scenario: Preview a track
- **WHEN** the user taps play on the search result "Yesterday" and the device's target is the main group
- **THEN** the GUI sends `playMedia` for the main group with `{uri: <Yesterday's uri>}` and no `shuffle`, and the playlist is not changed

#### Scenario: Previewed track is marked
- **WHEN** the target's state reports `track.uri` equal to the result "Yesterday" and `state: playing`
- **THEN** that row is marked, its button shows stop, and it shows a position slider

#### Scenario: Stop a preview
- **WHEN** the user taps stop on the marked row
- **THEN** the GUI sends `pause` for the target

#### Scenario: Resume a paused preview
- **WHEN** the marked track is paused and the user taps its play button
- **THEN** the GUI sends `play` for the target, not `playMedia`

#### Scenario: Seek in a preview
- **WHEN** the user drags the marked row's slider to 1:30 and releases it
- **THEN** the GUI sends `audioTargetSeek` with `position: 90` and the slider stays at 1:30 until the state reports the new position

#### Scenario: Buttons do not add
- **WHEN** the user taps a result's play button or its slider
- **THEN** no add request is sent

#### Scenario: Nothing follows a preview
- **WHEN** the previewed track ends
- **THEN** the target stops, because its queue held only that track

#### Scenario: No target yet
- **WHEN** the audio state has not been loaded
- **THEN** the preview buttons are disabled and tapping the row still adds the track
