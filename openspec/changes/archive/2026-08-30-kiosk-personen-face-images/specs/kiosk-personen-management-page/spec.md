## Purpose

Gives kiosk users a page to manage the people known to face recognition —
creating people and adding, viewing, and removing their reference images —
entirely inside this app, without needing to open Double Take's own admin UI.

## ADDED Requirements

### Requirement: Management page reachable from the Personen page

The `KioskPersonen` page SHALL show a "Personen" button below its back
button that opens the management page. The management page SHALL NOT be
reachable from the kiosk overview page. The management page SHALL show a
back link that returns to the `KioskPersonen` page.

#### Scenario: Opening the management page
- **WHEN** the user taps the "Personen" button on the `KioskPersonen` page
- **THEN** the management page opens

#### Scenario: Not listed on the kiosk overview
- **WHEN** a user views the kiosk overview page
- **THEN** no tile links directly to the management page

#### Scenario: Returning to the Personen page
- **WHEN** the user taps the back link on the management page
- **THEN** the `KioskPersonen` page opens

### Requirement: List of known people

The management page SHALL show the list of people currently known to face
recognition when it loads.

#### Scenario: People loaded
- **WHEN** the management page opens and people exist
- **THEN** each known person is shown in the list

#### Scenario: No people yet
- **WHEN** the management page opens and no people exist
- **THEN** the page shows an empty state instead of an empty list

#### Scenario: People list unreachable
- **WHEN** the list of people cannot be loaded (e.g. the backend is
  unreachable)
- **THEN** the page shows an error state rather than a blank or crashed
  page

### Requirement: Create a person

The management page SHALL let the user create a new person by providing a
name and at least one reference image in a single step. Double Take has
no concept of a person without a reference image, so the person is not
created until that first image is supplied (see design.md - Decisions).

#### Scenario: Successful creation
- **WHEN** the user submits a valid name together with at least one image
  for a new person
- **THEN** the person is created and appears in the list of known people,
  with the submitted image(s) among their reference images

#### Scenario: Creation fails
- **WHEN** creating a person fails (e.g. backend error or duplicate name)
- **THEN** the page shows an error and the list of known people is
  unchanged

### Requirement: View a person's reference images

The management page SHALL let the user select a known person and view
that person's reference images.

#### Scenario: Images shown
- **WHEN** the user selects a person who has reference images
- **THEN** each of that person's reference images is displayed

#### Scenario: No images yet
- **WHEN** the user selects a person who has no reference images
- **THEN** the page shows an empty state for that person's images

### Requirement: Upload reference images for a person

The management page SHALL let the user upload one or more images and
attach them as reference images to the selected person.

#### Scenario: Upload succeeds
- **WHEN** the user uploads one or more images for the selected person
- **THEN** the uploaded images appear among that person's reference images

#### Scenario: Upload fails
- **WHEN** an image upload fails
- **THEN** the page shows an error and the person's existing reference
  images are unchanged

### Requirement: Remove a reference image

The management page SHALL let the user remove a single reference image
from a person without affecting that person's other reference images.

#### Scenario: Removal succeeds
- **WHEN** the user removes one of a person's reference images
- **THEN** that image no longer appears among the person's reference
  images, and the person's other reference images are unchanged

#### Scenario: Removal fails
- **WHEN** removing a reference image fails
- **THEN** the page shows an error and the image remains listed

### Requirement: Delete a person

The management page SHALL let the user delete a person, which removes the
person and all of their reference images.

#### Scenario: Deletion succeeds
- **WHEN** the user deletes a person
- **THEN** the person no longer appears in the list of known people and
  none of their reference images remain accessible

#### Scenario: Deletion fails
- **WHEN** deleting a person fails
- **THEN** the page shows an error and the person remains in the list

### Requirement: Confirmation before destructive actions

Because the management page runs on shared kiosk devices, deleting a
person or removing a reference image SHALL require an explicit
confirmation step before the action takes effect.

#### Scenario: Confirming a deletion
- **WHEN** the user requests to delete a person or remove a reference
  image and confirms the action
- **THEN** the deletion or removal proceeds

#### Scenario: Cancelling a deletion
- **WHEN** the user requests to delete a person or remove a reference
  image and cancels the confirmation
- **THEN** nothing is deleted or removed
