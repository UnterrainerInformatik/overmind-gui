## MODIFIED Requirements

### Requirement: Tab content

Each tab SHALL show the "Weiterhören" row, a filter field and a list of all entries.

**The "Weiterhören" row**
- It holds the entries that are started and not fully played (`resumePosition > 0` and not
  `fullyPlayed`), at most 12, most recently played first. For the podcast tab these are
  episodes.
- It SHALL be hidden when no entry qualifies.
- It SHALL be one horizontal row that scrolls sideways when its entries do not fit.
- Each entry SHALL be compact: a small square thumbnail at its start, the name, the author (or
  the podcast's name for an episode) and its progress, in at most 64 px height.

**The list**
- It shows every book (or every podcast) as one row, one row under the other, in a single
  column.
- Each row SHALL start with a small square thumbnail (cover or placeholder) of at most 48 px,
  followed by the name and, under it, the authors (books) or the number of episodes
  (podcasts). Name and authors SHALL be cut with an ellipsis instead of wrapping.
- A book row SHALL show the book's total duration when it is known.
- A started book SHALL show its progress, and a fully played book SHALL be marked as played.
- A row SHALL be at most 64 px tall and SHALL be tappable over its whole width.
- Books (adults and kids) are sorted by first author, then name. Podcasts are sorted by name.
  Kids' books carry their series as author, so a series stays together and in episode order,
  read from top to bottom.

**The filter field**
- It narrows the list to entries whose name or authors contain the text, ignoring case.
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
- **THEN** the list shows only books whose author or name contains "kling", in any case

#### Scenario: Kids' series in order
- **WHEN** the "Kinder" tab lists "008 Diamantenjagd" and "007 Gruft der Piraten" by "Die drei Fragezeichen Kids" and "001" by "Wickie und die starken Männer"
- **THEN** the row of 007 is directly above the row of 008, and Wickie's 001 is not between them

#### Scenario: Room on the kiosk tablet
- **WHEN** the popup is shown at 1020x590 px on the "Erwachsene" tab with a "Weiterhören" row and 30 books
- **THEN** at least 4 list rows are fully visible without scrolling

#### Scenario: Row content
- **WHEN** a started book "Die Känguru-Chroniken" by "Marc-Uwe Kling" with a cover and a duration of 4 h 30 min is listed
- **THEN** its row shows the small cover at its start, the name, "Marc-Uwe Kling" under it, the duration and a progress bar

#### Scenario: Podcast row
- **WHEN** the "Podcasts" tab lists a podcast with 42 episodes
- **THEN** its row shows the podcast's thumbnail, its name and the episode count

#### Scenario: Phone width list
- **WHEN** the popup is opened at 390 px width
- **THEN** list rows fill the width, long names end with an ellipsis and the page has no horizontal scroll

### Requirement: Placeholder cover

An entry without `imageUrl` SHALL show a square placeholder on a background colour chosen from a
fixed palette by the entry's name. The same name SHALL always get the same colour.
- A small thumbnail (list rows and "Weiterhören" entries) SHALL show the entry's initials (up to
  two letters) in readable text.
- The large cover in the book detail SHALL show the entry's name and first author in readable
  text.

#### Scenario: Book without cover in the list
- **WHEN** a book "Tschick" has no `imageUrl`
- **THEN** its list row's thumbnail shows "T" on a coloured background, in both light and dark theme

#### Scenario: Book without cover
- **WHEN** the detail of a book without `imageUrl` is opened
- **THEN** its cover shows the book's name and author on the same colour as its list thumbnail

#### Scenario: Stable colour
- **WHEN** the popup is opened twice
- **THEN** a book without cover has the same colour both times

### Requirement: Book detail

Tapping a book in the list SHALL open its detail inside the popup, with a back control to the
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

Tapping a podcast in the list SHALL open its episode list inside the popup, with a back control,
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
