## Purpose

Defines how the clickable photo-capture overlay on a live kiosk video
stream SHALL indicate to the user that it can be clicked, without the
indication itself becoming a distraction in fullscreen kiosk use.

## ADDED Requirements

### Requirement: Pointer-cursor affordance on the photo-capture overlay

While a live video stream's photo-capture overlay is enabled, hovering
the pointer over the overlay SHALL show a pointer (button-like) mouse
cursor. Hovering SHALL NOT change the overlay's background color or
scale/transform the video or overlay.

#### Scenario: Hovering the overlay
- **WHEN** the mouse pointer moves over the photo-capture overlay on a
  live video stream
- **THEN** the mouse cursor changes to a pointer
- **AND** no background-color tint or scale animation is applied to the
  overlay or the video

#### Scenario: Moving the pointer away
- **WHEN** the mouse pointer moves off the photo-capture overlay
- **THEN** the cursor returns to its default appearance

#### Scenario: Photo capture disabled
- **WHEN** the photo-capture overlay is disabled for a given stream
- **THEN** hovering it SHALL NOT show a pointer cursor
