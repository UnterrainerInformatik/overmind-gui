## ADDED Requirements

### Requirement: The archive's fill level is visible

The archive page SHALL show how full the archive is: the space its entries occupy
against its configured size, as a proportion and in gigabytes, and how far back
it currently reaches, as the date of its oldest entry. It SHALL state that a full
archive makes room for new entries by dropping its oldest ones.

A full archive SHALL be shown as the normal state of a ring buffer, not as an
error.

#### Scenario: A partly filled archive
- **WHEN** the server reports an archive size of 100 GB with 35 GB in use and an
  oldest entry from 2026-03-02
- **THEN** the page shows the archive 35 % full, with 35 GB of 100 GB, reaching
  back to 2026-03-02

#### Scenario: A full archive
- **WHEN** the entries occupy the archive's whole size
- **THEN** the page shows the archive as full and says that each new entry
  displaces the oldest ones, in the gauge's neutral colour

#### Scenario: An empty archive
- **WHEN** the archive holds no entries
- **THEN** the page shows it empty, with its size, and no oldest date

#### Scenario: Usage cannot be read
- **WHEN** the archive's usage cannot be read but its entries can
- **THEN** the page lists the entries as usual and shows the fill level as
  unknown, rather than hiding the list or showing zero
