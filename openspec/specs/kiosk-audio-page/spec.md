# kiosk-audio-page Specification

## Purpose

Gives the kiosk a page to control music through the embedded Music Assistant web UI, signed in
without a login prompt, with a constant way back to the kiosk overview.

## Requirements

### Requirement: Audio tile on the kiosk overview

The kiosk overview SHALL show an "Audio" link tile (German: "Audio") in its link row that navigates
to the kiosk audio page.

#### Scenario: Open the audio page from the overview
- **WHEN** the user taps the "Audio" tile on the kiosk overview
- **THEN** the app navigates to `/app/kioskaudio`

### Requirement: Embedded Music Assistant UI

The kiosk audio page SHALL show the Music Assistant web UI from the configured Music Assistant URL,
filling the whole viewport below the back bar, on tablet, mobile and PC widths, without the page
itself scrolling.

#### Scenario: Page shows Music Assistant
- **WHEN** the user opens `/app/kioskaudio` and a Music Assistant URL is configured
- **THEN** the Music Assistant UI is shown in the area below the back bar and fills it

#### Scenario: No URL configured
- **WHEN** the user opens `/app/kioskaudio` and no Music Assistant URL is configured
- **THEN** the page shows a short notice that audio is not configured instead of an empty frame, and the back bar remains usable

### Requirement: Signed-in start without a login prompt

When a Music Assistant access token is configured, the kiosk audio page SHALL open Music Assistant
already authenticated with that token, so no login form is shown. When no token is configured, the
page SHALL open Music Assistant without a token and leave sign-in to Music Assistant.

#### Scenario: Token configured
- **WHEN** a valid Music Assistant token is configured and the user opens the audio page
- **THEN** Music Assistant appears signed in, without showing its login form

#### Scenario: No token configured
- **WHEN** no Music Assistant token is configured and the user opens the audio page
- **THEN** Music Assistant is shown with its own login form

### Requirement: Way back to the overview

The kiosk audio page SHALL show a back control above the embedded UI at all times, independent of
where the user navigates inside Music Assistant, and the control SHALL navigate to the kiosk
overview.

#### Scenario: Back after navigating inside Music Assistant
- **WHEN** the user has navigated to some page inside Music Assistant and taps the back control
- **THEN** the app navigates to `/app/kioskoverview`

### Requirement: Token stays out of source control and image

The Music Assistant token SHALL be supplied only at runtime by the deployment; it MUST NOT be
contained in the repository or in the published Docker image.

#### Scenario: Default build carries no token
- **WHEN** the app is built from the repository and run without a deployment-specific config
- **THEN** the served runtime config contains no Music Assistant token
