## MODIFIED Requirements

### Requirement: Bar controls

The bar SHALL show, in this order from left to right: the target selector, the current title and
artist, previous track, back 10 s, play/pause, forward 10 s, next track, the shuffle toggle, a
draggable progress slider, a volume control, a radio button and an audiobooks button. All commands SHALL go to the
currently selected target. The ±10 s buttons SHALL seek to the current interpolated position
±10 s, clamped to `0..duration`. Releasing the progress slider SHALL seek to the released
position. The volume control SHALL set the target's volume (the main group's volume for the main
group, the room's volume for a solo room). Play/pause SHALL show "pause" while the target is
playing and "play" otherwise. When the target has no track, the title area SHALL show a neutral
"nothing playing" text and the seek controls SHALL be disabled. When the track has no duration
(e.g. a radio stream), the progress slider and the ±10 s buttons SHALL be disabled.

While the current item is an audiobook (its track URI starts with `library://audiobook/`) or a
podcast episode (its track URI's scheme is followed by `podcast_episode/`), the skip buttons SHALL skip ±30 s instead of
±10 s, clamped to `0..duration`. While the current item is an audiobook with at least two
chapters, once its chapter list is loaded:
- the title area SHALL show the current chapter's name, and its subtitle SHALL show the book's
  name and authors;
- the current chapter SHALL be the last chapter whose `start` is at or before the interpolated
  position;
- the progress slider SHALL span the current chapter and show the position within it, and
  releasing it SHALL seek to the chapter's `start` plus the released value;
- previous SHALL seek to the start of the current chapter when the position is more than 3 s
  into it, and otherwise to the start of the previous chapter (on the first chapter: to 0);
- next SHALL seek to the start of the next chapter, and SHALL be disabled on the last chapter.

A chapter without `end` SHALL end at the book's `duration`. While the chapter list is not
loaded, or could not be loaded, or for a book with fewer than two chapters, the bar SHALL behave
as for a plain track, with ±30 s, except that previous SHALL seek to 0 instead of sending the
queue command. For a podcast episode, previous and next SHALL stay queue commands.

The shuffle toggle SHALL show the selected target's shuffle mode (`playback.shuffle` in the audio
state), not a choice stored on the device. Tapping it SHALL send
`PUT /audio/targets/{targetId}/shuffle` with `{enabled: <the opposite of the shown mode>}` at
once, whether or not the target is playing. After the tap the toggle SHALL show the requested
mode until a state reports that mode or about 3 s have passed, and then SHALL show the state's
mode again. The toggle SHALL be disabled while the audio state is unavailable. It SHALL stay
usable while a radio station plays. A failed switch SHALL show a short error message, and the
toggle SHALL show the state's mode again.

#### Scenario: Pause the main group
- **WHEN** the main group is the target and is playing, and the user taps pause
- **THEN** the GUI sends `POST /audio/targets/{mainGroup.targetId}/pause`
- **AND** the button shows "play" once the next state reports `paused`

#### Scenario: Skip forward 10 seconds
- **WHEN** the interpolated position is 62 s of a 200 s track and the user taps +10 s
- **THEN** the GUI sends `POST /audio/targets/{targetId}/seek` with `{position: 72}`

#### Scenario: Skip forward near the end
- **WHEN** the interpolated position is 195 s of a 200 s track and the user taps +10 s
- **THEN** the GUI sends a seek with `{position: 200}`

#### Scenario: Seek with the slider
- **WHEN** the user drags the progress slider to 1:30 and releases it
- **THEN** the GUI sends one seek with `{position: 90}`

#### Scenario: Radio stream without duration
- **WHEN** the target plays a track whose `duration` is `null`
- **THEN** the progress slider and the ±10 s buttons are disabled
- **AND** play/pause, previous, next, shuffle and volume remain usable

#### Scenario: Command fails
- **WHEN** a playback command answers with an error
- **THEN** the GUI shows a short error message and the bar keeps showing the last known state

#### Scenario: Shuffle shows the player's mode
- **WHEN** the selected target's state reports `shuffle: true`, set from another device or the MA UI
- **THEN** the bar's shuffle toggle is on

#### Scenario: Turn shuffle on while playing
- **WHEN** the target plays a playlist unshuffled and the user taps the shuffle toggle
- **THEN** the GUI sends `PUT /audio/targets/{targetId}/shuffle` with `{enabled: true}`
- **AND** the toggle is on at once and stays on when the next state reports `shuffle: true`

#### Scenario: Switch not confirmed
- **WHEN** the user turned shuffle on and no state reports `shuffle: true` within about 3 s
- **THEN** the toggle shows the state's mode (off) again

#### Scenario: Switch fails
- **WHEN** the shuffle switch answers with an error
- **THEN** the GUI shows a short error message and the toggle shows the state's mode

#### Scenario: Other target selected
- **WHEN** the main group shuffles, a solo room does not, and the user selects that room as the target
- **THEN** the bar's shuffle toggle is off

#### Scenario: Skip forward 30 seconds in an audiobook
- **WHEN** an audiobook plays at an interpolated position of 600 s and the user taps forward
- **THEN** the GUI sends a seek with `{position: 630}`

#### Scenario: Chapter shown in the bar
- **WHEN** an audiobook with chapters starting at 0, 900 and 1800 s plays at 1000 s
- **THEN** the title area shows the second chapter's name and the book's name and authors
- **AND** the progress slider spans 900..1800 and shows 100 s

#### Scenario: Previous within a chapter
- **WHEN** that audiobook plays at 1000 s and the user taps previous
- **THEN** the GUI sends a seek with `{position: 900}` and no `previous` command

#### Scenario: Previous at a chapter start
- **WHEN** that audiobook plays at 902 s and the user taps previous
- **THEN** the GUI sends a seek with `{position: 0}`

#### Scenario: Next chapter
- **WHEN** that audiobook plays at 1000 s and the user taps next
- **THEN** the GUI sends a seek with `{position: 1800}` and no `next` command

#### Scenario: Last chapter
- **WHEN** that audiobook plays at 2000 s
- **THEN** the next button is disabled

#### Scenario: Chapters not available
- **WHEN** an audiobook plays and its chapter list request fails
- **THEN** the bar shows the track title, the slider spans the whole book, and the skip buttons skip ±30 s

#### Scenario: Previous on a book without chapter mode
- **WHEN** an audiobook whose chapter list could not be loaded plays at 600 s and the user taps previous
- **THEN** the GUI sends a seek with `{position: 0}` and no `previous` command

#### Scenario: Podcast episode
- **WHEN** a podcast episode plays and the user taps next
- **THEN** the GUI sends `POST /audio/targets/{targetId}/next`
- **AND** the skip buttons skip ±30 s

### Requirement: Usable on tablet, mobile and PC widths

The bar SHALL fit the viewport width without horizontal scrolling on tablet, mobile and PC
widths. On narrow widths (below 600 px) the ±10 s buttons, previous track and the shuffle toggle
SHALL be omitted and the title SHALL be truncated with an ellipsis; target selector, play/pause,
next, progress slider, volume, radio and the audiobooks button SHALL remain available. On narrow widths shuffle SHALL
stay reachable through the queue popup (requirement "Queue and playlist popup"). The popups SHALL
fit the viewport on every width and be closable with an explicit close control. On widths below
1020 px the audio plan popup SHALL scale its floor plan down to the viewport width and MAY scroll
vertically, but SHALL NOT scroll the page sideways.

#### Scenario: Phone width
- **WHEN** the kiosk is shown at 390 px width
- **THEN** the bar has no horizontal scroll and shows target, title, play/pause, next, slider, volume, radio and the audiobooks button
- **AND** the bar shows no shuffle toggle

#### Scenario: Shuffle on the bar from tablet width
- **WHEN** the kiosk is shown at 800 px width
- **THEN** the bar shows the shuffle toggle between next track and the progress slider

#### Scenario: Popup on phone
- **WHEN** the audio plan popup is opened at 390 px width
- **THEN** the floor plan is 390 px wide, the page has no horizontal scroll, and the popup can be closed with its close control
