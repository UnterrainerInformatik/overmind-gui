## MODIFIED Requirements

### Requirement: Overview lists every active migration

The Migrations Overview page SHALL render one expansion panel per active backend migration. Each panel's header SHALL identify the migration by name/type (e.g. "DNS nameserver → 10.10.196.3") and SHALL show the count of nodes completed, the count of nodes still pending, and the count of nodes in error, so a collapsed migration remains scannable. Expanding a panel SHALL reveal that migration's full detail view (the pending/done/error node columns). The panels SHALL behave as an accordion: expanding one panel SHALL collapse any other. All panel headers SHALL be visible on screen at the same time for any realistic number of concurrent migrations, so the operator can see that more than one migration exists without scrolling.

#### Scenario: Multiple active migrations
- **WHEN** the backend reports more than one active migration
- **THEN** the page renders a separate expansion panel for each, every panel header showing that migration's name/type and its done/pending/error counts, with all headers visible at once

#### Scenario: Expanding a migration
- **WHEN** the operator taps a collapsed migration's panel header
- **THEN** that panel expands to show the migration's pending/done/error node columns, and any previously expanded panel collapses

#### Scenario: Single active migration starts expanded
- **WHEN** the backend reports exactly one active migration
- **THEN** that migration's panel is expanded without requiring a tap

#### Scenario: No active migrations
- **WHEN** the backend reports zero active migrations
- **THEN** the page shows an explicit empty state instead of a blank area

### Requirement: Overview fills the kiosk screen with equal columns

On the kiosk tablet's screen (1024x600), the Migrations Overview SHALL use the full available width, and the expanded migration's pending, done and error columns SHALL be equally wide regardless of how much content each holds. The expanded panel SHALL fit within the screen height without page-level scrolling, with its node lists sized to the height remaining below the page title, the collapsed panel headers, and the expanded panel's own header and column headings. The fixed back button SHALL NOT permanently obscure any node row: the column it overlaps SHALL allow its last entries to be scrolled clear of it.

#### Scenario: Single migration entry on the kiosk tablet
- **GIVEN** the backend reports one active migration
- **WHEN** a migration's panel is expanded on the 1024x600 kiosk screen
- **THEN** the expanded panel spans the screen width, its three columns are equally wide, and the page itself does not scroll

#### Scenario: Column widths stay stable across refreshes
- **GIVEN** a migration whose pending, done and error lists differ in length
- **WHEN** an automatic refresh changes how many nodes each list holds
- **THEN** the three columns keep the same width as before

#### Scenario: Back button does not hide node rows
- **WHEN** the column overlapped by the fixed back button holds more nodes than fit above it
- **THEN** the operator can scroll that column so its last node rows appear clear of the button
