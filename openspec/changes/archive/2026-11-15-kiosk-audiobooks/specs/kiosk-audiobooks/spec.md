## Purpose

Lets the household find, start and resume audiobooks (adults and kids) and podcast episodes
from any kiosk page. One playback position per book or episode is kept by Music Assistant and
shared by all rooms.

## ADDED Requirements

### Requirement: Server routes for audiobooks and podcasts

The GUI SHALL rely on these java-overmind-server routes and SHALL NOT store playback positions
itself.

**Audiobooks**
- `GET /audio/audiobooks?library=adults|kids` answers `{items: [Audiobook]}` with every book of
  that library. `Audiobook` is `{id, uri, name, authors, imageUrl, duration, resumePosition,
  fullyPlayed, recentRank}`:
  - `authors` is a list of names;
  - `imageUrl` is null without a cover;
  - `duration` and `resumePosition` are in seconds, and `resumePosition` is 0 when not started;
  - `recentRank` is the play order: `1` = heard most recently, null = never.
- `GET /audio/audiobooks/{id}` answers the `Audiobook` plus `chapters: [{position, name, start,
  end}]` sorted by `start`. `start` and `end` are in seconds, and `end` may be null.

**Podcasts**
- `GET /audio/podcasts` answers `{items: [Podcast]}`, with `Podcast` = `{id, uri, name,
  imageUrl, episodeCount, recentRank}`.
- `GET /audio/podcasts/{id}/episodes` answers `{items: [Episode]}` sorted by `position`.
  `Episode` is `{id, uri, name, position, duration, resumePosition, fullyPlayed, recentRank,
  imageUrl}`.

**Played marking and playback**
- `PUT /audio/played` with `{uri, played}` marks a book or episode as played or unplayed
  (`204`).
- `POST /audio/targets/{targetId}/playMedia` with `{uri}` plays a book or episode, resuming at
  the stored position. With `{uri, position}` it starts at `position` seconds.

**Errors and audio state**
- Unknown ids answer `404`, and invalid input answers `400`.
- While a book or episode plays, the audio state's track URI is the book's or episode's URI,
  `elapsed` is the position in the whole item and `duration` is its total duration.

#### Scenario: List the kids' books
- **WHEN** the GUI calls `GET /audio/audiobooks?library=kids`
- **THEN** it receives only the books of the kids' library, each with its resume position and played flag

#### Scenario: Resume through playMedia
- **WHEN** a book was stopped at 1234 s and the GUI posts its `uri` to `playMedia` without `position`
- **THEN** playback continues at about 1234 s

#### Scenario: Start at a position
- **WHEN** the GUI posts `{uri, position: 0}` to `playMedia` for a book stopped at 1234 s
- **THEN** playback starts at 0 s

### Requirement: Audiobooks button and popup

The kiosk audio bar SHALL have an audiobooks button that opens the audiobooks popup. Every
command the popup sends SHALL go to the bar's selected target. The popup SHALL:
- have tabs "Erwachsene", "Kinder" and "Podcasts";
- open on the tab that was open last on this device, or on "Erwachsene" when none is stored or
  storage is blocked;
- fit the viewport on tablet, mobile and PC widths without horizontal scrolling;
- be closable with an explicit close control.

#### Scenario: Open the popup
- **WHEN** the user taps the audiobooks button in the bar
- **THEN** the popup opens on the last used tab and loads that tab's list

#### Scenario: Tab remembered
- **WHEN** the user switches to "Kinder", closes the popup and reloads the page
- **THEN** the popup opens on "Kinder" next time

#### Scenario: Storage blocked
- **WHEN** the browser refuses access to local storage
- **THEN** the popup opens on "Erwachsene" and works normally

#### Scenario: Phone width
- **WHEN** the popup is opened at 390 px width
- **THEN** the page has no horizontal scroll and the popup can be closed with its close control

### Requirement: Tab content

Each tab SHALL show the "Weiterhören" row, a filter field and a grid of all entries.

**The "Weiterhören" row**
- It holds the entries that are started and not fully played (`resumePosition > 0` and not
  `fullyPlayed`), at most 12, most recently played first. For the podcast tab these are
  episodes.
- It SHALL be hidden when no entry qualifies.
- Each entry SHALL show its progress.

**The grid**
- It shows every book (or every podcast) as a cover tile with name and author.
- Books (adults and kids) are sorted by first author, then name. Podcasts are sorted by name.
  Kids' books carry their series as author, so a series stays together and in episode order.
- A started book SHALL show its progress, and a fully played book SHALL be marked as played.

**The filter field**
- It narrows the grid to entries whose name or authors contain the text, ignoring case.
- It SHALL NOT take focus when the popup opens, and SHALL be empty each time the popup opens.

**Loading**
- While a list loads for the first time, the tab SHALL show a loading indicator.
- When the list is reloaded, the shown entries SHALL stay until the new ones arrive.

#### Scenario: Weiterhören row
- **WHEN** two kids' books are started, one with `recentRank` 4 and one with `recentRank` 1, and the "Kinder" tab is shown
- **THEN** the row shows the book ranked 1 first, then the one ranked 4

#### Scenario: Nothing in progress
- **WHEN** no book of the adults' library is started
- **THEN** the "Erwachsene" tab shows no "Weiterhören" row

#### Scenario: Filter by author
- **WHEN** the user types "kling" in the adults' filter
- **THEN** the grid shows only books whose author or name contains "kling", in any case

#### Scenario: Kids' series in order
- **WHEN** the "Kinder" tab lists "008 Diamantenjagd" and "007 Gruft der Piraten" by "Die drei Fragezeichen Kids" and "001" by "Wickie und die starken Männer"
- **THEN** 007 comes before 008, and Wickie's 001 does not come between them

### Requirement: Placeholder cover

An entry without `imageUrl` SHALL show a square placeholder tile with its name and first author
in readable text, on a background colour chosen from a fixed palette by the entry's name. The
same name SHALL always get the same colour.

#### Scenario: Book without cover
- **WHEN** a book has no `imageUrl`
- **THEN** its tile shows the book's name and author on a coloured background, in both light and dark theme

#### Scenario: Stable colour
- **WHEN** the popup is opened twice
- **THEN** a book without cover has the same colour both times

### Requirement: Resume from the Weiterhören row

Tapping an entry in the "Weiterhören" row SHALL play it at once on the selected target, resuming
at the stored position (`playMedia` with `{uri}` and no `position`).

#### Scenario: One tap to continue
- **WHEN** the user taps a started book in the "Weiterhören" row
- **THEN** the GUI sends `POST /audio/targets/{targetId}/playMedia` with `{uri: <the book's uri>}` and no `position`

### Requirement: Book detail

Tapping a book in the grid SHALL open its detail inside the popup, with a back control to the
list. The detail SHALL be loaded fresh when it opens.

**Content**
- Cover (or placeholder), name, authors, total duration and progress.
- The chapter list with each chapter's name and length. The chapter that contains the resume
  position SHALL be marked.

**Actions**
- "Weiterhören" for a started book, or "Abspielen" for one not started or fully played: plays
  the book without `position`. A fully played book SHALL play from 0 (`position: 0`).
- "Von vorne": plays the book with `position: 0`.
- Tapping a chapter: plays the book with `position: <the chapter's start>`.
- A menu with "Als gehört markieren" and "Als ungehört markieren": sends `PUT /audio/played`
  with `played: true` or `false`.

**After an action**

After any of these actions the detail and the open tab's list SHALL be reloaded once, shortly
afterwards. A failed request SHALL show a short error message and leave the shown data as it was.

#### Scenario: Resume a started book
- **WHEN** the user opens a book stopped in chapter 4 and taps "Weiterhören"
- **THEN** chapter 4 is marked in the list and the GUI sends `playMedia` with `{uri}` and no `position`

#### Scenario: Start over
- **WHEN** the user taps "Von vorne" on a started book
- **THEN** the GUI sends `playMedia` with `{uri, position: 0}`

#### Scenario: Start at a chapter
- **WHEN** the user taps chapter 3, which starts at 1800 s
- **THEN** the GUI sends `playMedia` with `{uri, position: 1800}`

#### Scenario: Mark unplayed
- **WHEN** the user chooses "Als ungehört markieren" on a started book
- **THEN** the GUI sends `PUT /audio/played` with `{uri, played: false}`
- **AND** after the reload the book no longer appears in the "Weiterhören" row

#### Scenario: Play fails
- **WHEN** `playMedia` answers with an error
- **THEN** the GUI shows a short error message and the detail stays open

### Requirement: Podcast detail

Tapping a podcast in the grid SHALL open its episode list inside the popup, with a back control,
loaded fresh when it opens.
- Each episode SHALL show its name, duration and progress, or be marked as played when fully
  played.
- Tapping an episode SHALL play it: without `position` when started and not fully played,
  otherwise with `position: 0`.
- Each episode SHALL offer "Von vorne" (`position: 0`), "Als gehört markieren" and "Als
  ungehört markieren" (`PUT /audio/played`).
- After an action the list SHALL be reloaded once, shortly afterwards, and a failed request
  SHALL show a short error message.

#### Scenario: Continue an episode
- **WHEN** the user taps an episode stopped at 300 s
- **THEN** the GUI sends `playMedia` with `{uri: <the episode's uri>}` and no `position`

#### Scenario: Replay a finished episode
- **WHEN** the user taps a fully played episode
- **THEN** the GUI sends `playMedia` with `{uri, position: 0}`

### Requirement: Routes not yet available

When a list route answers `404`, the tab SHALL show a notice that audiobooks are not yet
available on the server, instead of an error message. The rest of the bar SHALL keep working.

#### Scenario: Server not yet deployed
- **WHEN** `GET /audio/audiobooks?library=adults` answers `404`
- **THEN** the "Erwachsene" tab shows the "not yet available" notice
