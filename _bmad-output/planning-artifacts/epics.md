---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
inputDocuments:
  - "planning-artifacts/prd.md"
  - "planning-artifacts/architecture.md"
  - "planning-artifacts/ux-design-specification.md"
workflowType: 'epics-and-stories'
project_name: 'family-video-upload-project'
user_name: 'Jeremiah'
date: '2026-01-02'
---

# family-video-upload-project - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for family-video-upload-project, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Video Discovery & Display**
- FR1: Santiago can view a list of all untagged videos from the Jellyfin library
- FR2: Santiago can see which videos have already been tagged vs untagged
- FR3: Santiago can identify videos by their filename/thumbnail in the list
- FR4: System retrieves video list from Jellyfin REST API on page load

**Video Playback**
- FR5: Santiago can click a video to open it in Jellyfin for playback
- FR6: System opens Jellyfin playback in a new browser tab
- FR7: Santiago can return to the tagger after watching without losing form state

**Metadata Entry**
- FR8: Santiago can enter a title for the video
- FR9: Santiago can select a date for when the video was filmed
- FR10: Santiago can select one or more people who appear in the video
- FR11: Santiago can assign a rating (1-10) to the video
- FR12: Santiago can enter a free-text description of the video content
- FR13: Santiago can view previously entered metadata for a video (if editing)

**Data Persistence**
- FR14: System saves metadata as an NFO file in Jellyfin-compatible XML format
- FR15: System writes NFO file to the same directory as the video file
- FR16: System triggers Jellyfin library refresh after saving
- FR17: Santiago receives visual confirmation when save succeeds
- FR18: System preserves form data if save fails (allowing retry)

**Error Handling**
- FR19: Santiago receives clear error messages when operations fail
- FR20: Santiago can retry a failed save operation
- FR21: Santiago can skip a problematic video and continue with the next one
- FR22: System handles Jellyfin API unavailability gracefully

**Administration & Configuration**
- FR23: Jeremiah can configure Jellyfin server URL via environment variable
- FR24: Jeremiah can configure Jellyfin API key via environment variable
- FR25: Jeremiah can configure the media directory path via environment variable
- FR26: Jeremiah can deploy the application as a Docker container

### NonFunctional Requirements

**Performance**
- NFR1: Initial page load < 3 seconds
- NFR2: Video list population < 2 seconds
- NFR3: Save operation feedback < 1 second perceived
- NFR4: Handle 1,500+ video library without pagination for MVP

**Security**
- NFR5: Authentication handled by Cloudflare Access (MFA) - no auth in app
- NFR6: API key stored in environment variables, never exposed to browser
- NFR7: All traffic via Cloudflare Tunnel (HTTPS)

**Reliability**
- NFR8: NFO files are authoritative; no data loss on webapp restart
- NFR9: Unsaved form data survives network interruptions
- NFR10: Clear error messages when Jellyfin is unavailable

**Accessibility**
- NFR11: WCAG 2.1 Level A compliance
- NFR12: All form fields accessible via keyboard
- NFR13: All inputs have visible, descriptive labels

**Integration**
- NFR14: Works with Jellyfin 10.11+
- NFR15: Generates valid Jellyfin-compatible NFO XML
- NFR16: Triggers Jellyfin scan after save

### Additional Requirements

**From Architecture:**
- Monorepo setup with npm workspaces (Next.js + NestJS + shared packages)
- Zod validation schemas shared between frontend and backend
- Atomic NFO file writes (write to temp file, then rename)
- Docker Compose deployment with separate Dockerfiles for web and api
- REST API with structured response patterns (data + message or error + details)
- Save confirmation with toast notifications (critical requirement)
- CSS Modules for scoped styling

**From UX Design:**
- Two-column layout: video list (left) + tagging form (right)
- Filter dropdown for Untagged/Tagged/All views
- "Watch in Jellyfin" button opens video in new tab
- Auto-dismiss success toast after 2 seconds
- Progress counter in footer (Tagged: X / 1,500)
- System font stack, browser default styling
- Simple scrollable video list with selection highlighting

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 2 | View untagged videos list |
| FR2 | Epic 2 | See tagged vs untagged status |
| FR3 | Epic 2 | Identify videos by filename |
| FR4 | Epic 2 | Retrieve list from Jellyfin API |
| FR5 | Epic 3 | Click to open in Jellyfin |
| FR6 | Epic 3 | Opens in new browser tab |
| FR7 | Epic 3 | Form state preserved while watching |
| FR8 | Epic 3 | Enter title |
| FR9 | Epic 3 | Select date |
| FR10 | Epic 3 | Select people |
| FR11 | Epic 3 | Assign rating |
| FR12 | Epic 3 | Enter description |
| FR13 | Epic 3 | View existing metadata |
| FR14 | Epic 4 | Save as NFO XML |
| FR15 | Epic 4 | Write NFO to video directory |
| FR16 | Epic 4 | Trigger Jellyfin refresh |
| FR17 | Epic 4 | Visual save confirmation |
| FR18 | Epic 4 | Preserve form on failure |
| FR19 | Epic 5 | Clear error messages |
| FR20 | Epic 5 | Retry failed saves |
| FR21 | Epic 5 | Skip problematic videos |
| FR22 | Epic 5 | Handle Jellyfin unavailability |
| FR23 | Epic 1 | Configure Jellyfin URL |
| FR24 | Epic 1 | Configure API key |
| FR25 | Epic 1 | Configure media path |
| FR26 | Epic 1 | Docker deployment |

## Epic List

### Epic 1: Project Foundation & Development Environment
Jeremiah has a working development environment with the monorepo structure ready for feature development.
**FRs covered:** FR23, FR24, FR25, FR26

### Epic 2: Video Discovery
Santiago can see all untagged videos from Jellyfin and select one to work with.
**FRs covered:** FR1, FR2, FR3, FR4

### Epic 3: Video Tagging Workflow
Santiago can watch a video in Jellyfin and enter all metadata fields.
**FRs covered:** FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13

### Epic 4: Save & Persistence
Santiago can save metadata and see clear confirmation that his work was saved successfully.
**FRs covered:** FR14, FR15, FR16, FR17, FR18

### Epic 5: Error Handling & Resilience
Santiago can recover gracefully when things go wrong without losing work.
**FRs covered:** FR19, FR20, FR21, FR22

---

## Epic 1: Project Foundation & Development Environment

Jeremiah has a working development environment with the monorepo structure ready for feature development.

### Story 1.1: Initialize Monorepo Structure

As a **developer**,
I want **to set up the npm workspaces monorepo with Next.js, NestJS, and shared packages**,
So that **I have a consistent development environment for building the application**.

**Acceptance Criteria:**

**Given** an empty project directory
**When** I run the initialization scripts
**Then** a monorepo structure is created with `apps/web`, `apps/api`, and `packages/shared`
**And** npm workspaces are configured in the root `package.json`
**And** TypeScript is configured in all packages
**And** I can run `npm install` from the root to install all dependencies

### Story 1.2: Configure Environment Variables

As a **developer**,
I want **to configure Jellyfin URL, API key, and media path via environment variables**,
So that **the application can connect to Jellyfin and write NFO files to the correct location**.

**Acceptance Criteria:**

**Given** the monorepo is initialized
**When** I create a `.env` file with `JELLYFIN_URL`, `JELLYFIN_API_KEY`, and `MEDIA_PATH`
**Then** the NestJS API can read these values at startup
**And** a `.env.example` file documents all required variables
**And** the `.env` file is excluded from git via `.gitignore`

### Story 1.3: Docker Compose Deployment

As a **developer**,
I want **to deploy the application as Docker containers using Docker Compose**,
So that **I can run the webapp on my Proxmox VM**.

**Acceptance Criteria:**

**Given** the monorepo with web and api apps
**When** I run `docker-compose up`
**Then** both containers start successfully
**And** the web container serves the frontend on port 3000
**And** the api container serves the backend on port 3001
**And** environment variables are passed to containers correctly
**And** the media directory is mounted as a volume in the api container

---

## Epic 2: Video Discovery

Santiago can see all untagged videos from Jellyfin and select one to work with.

### Story 2.1: Jellyfin API Integration

As a **developer**,
I want **the API to fetch video data from Jellyfin REST API**,
So that **the frontend can display the video library**.

**Acceptance Criteria:**

**Given** valid Jellyfin credentials in environment variables
**When** the API receives a request to `GET /videos`
**Then** it returns a list of videos from the configured Jellyfin library
**And** each video includes id, filename, and tagged status
**And** errors from Jellyfin are handled gracefully with appropriate error responses

### Story 2.2: Video List Display

As **Santiago**,
I want **to see a list of all videos from my Jellyfin library**,
So that **I can choose which video to tag next**.

**Acceptance Criteria:**

**Given** the webapp is loaded
**When** the page initializes
**Then** a scrollable list of videos appears in the left panel
**And** each video displays its filename
**And** the list loads within 2 seconds (NFR2)

### Story 2.3: Tagged/Untagged Filtering

As **Santiago**,
I want **to filter the video list by tagged status**,
So that **I can focus on videos that still need tagging**.

**Acceptance Criteria:**

**Given** the video list is displayed
**When** I select "Untagged" from the filter dropdown
**Then** only untagged videos are shown
**And** when I select "Tagged", only tagged videos are shown
**And** when I select "All", all videos are shown
**And** the default filter is "Untagged"

### Story 2.4: Video Selection

As **Santiago**,
I want **to select a video from the list**,
So that **I can view its details and tag it**.

**Acceptance Criteria:**

**Given** the video list is displayed
**When** I click on a video row
**Then** that row is visually highlighted as selected
**And** the tagging form on the right panel becomes active for that video
**And** only one video can be selected at a time

---

## Epic 3: Video Tagging Workflow

Santiago can watch a video in Jellyfin and enter all metadata fields.

### Story 3.1: Watch in Jellyfin

As **Santiago**,
I want **to click a button to watch the selected video in Jellyfin**,
So that **I can see the video content before tagging it**.

**Acceptance Criteria:**

**Given** a video is selected
**When** I click "Watch in Jellyfin"
**Then** the video opens in Jellyfin in a new browser tab
**And** the tagger tab remains open with my form data preserved
**And** I can return to the tagger tab to complete the form

### Story 3.2: Metadata Entry Form

As **Santiago**,
I want **to enter metadata for the selected video**,
So that **I can describe the video content for the family**.

**Acceptance Criteria:**

**Given** a video is selected
**When** I view the tagging form
**Then** I see input fields for: Title (text), Date (date picker), People (multi-select), Rating (1-10), Description (textarea)
**And** Title is marked as required
**And** all other fields are optional
**And** the form uses native HTML inputs with browser defaults

### Story 3.3: People Selection

As **Santiago**,
I want **to select one or more family members who appear in the video**,
So that **videos can be found by who's in them**.

**Acceptance Criteria:**

**Given** the tagging form is displayed
**When** I interact with the People field
**Then** I can select multiple people from a predefined list
**And** selected people are visually indicated
**And** I can deselect people I've already selected

### Story 3.4: Load Existing Metadata

As **Santiago**,
I want **to see any existing metadata when I select a previously tagged video**,
So that **I can review or edit my previous work**.

**Acceptance Criteria:**

**Given** a video that has been previously tagged
**When** I select that video
**Then** the form populates with the existing metadata values
**And** I can modify any field and save the changes

---

## Epic 4: Save & Persistence

Santiago can save metadata and see clear confirmation that his work was saved successfully.

### Story 4.1: NFO File Generation

As a **developer**,
I want **the API to generate Jellyfin-compatible NFO XML files**,
So that **metadata is stored in a format Jellyfin understands**.

**Acceptance Criteria:**

**Given** valid metadata for a video
**When** the API receives a save request
**Then** it generates an NFO file with valid Jellyfin XML format
**And** the file includes title, date, people (as actors), rating, and description
**And** the file is written atomically (temp file then rename) to prevent corruption

### Story 4.2: Save Metadata

As **Santiago**,
I want **to save the metadata I've entered**,
So that **my tagging work is preserved**.

**Acceptance Criteria:**

**Given** I have filled in metadata for a video
**When** I click the "Save" button
**Then** the button shows "Saving..." while the operation is in progress
**And** the NFO file is written to the same directory as the video file
**And** the save operation completes within 1 second (perceived) (NFR3)

### Story 4.3: Jellyfin Library Refresh

As **Santiago**,
I want **Jellyfin to automatically see my saved metadata**,
So that **I don't have to manually refresh the library**.

**Acceptance Criteria:**

**Given** metadata has been saved to an NFO file
**When** the save operation completes
**Then** the API triggers a Jellyfin library refresh
**And** the metadata will appear in Jellyfin after the refresh completes

### Story 4.4: Save Confirmation Toast

As **Santiago**,
I want **to see clear confirmation when my save succeeds**,
So that **I know my work wasn't lost**.

**Acceptance Criteria:**

**Given** I click Save
**When** the save operation succeeds
**Then** a green toast notification appears: "✓ Saved: [video title]"
**And** the toast auto-dismisses after 3 seconds
**And** the video moves to the "tagged" category in the list
**And** the progress counter updates (Tagged: X / 1,500)

### Story 4.5: Form State Preservation on Failure

As **Santiago**,
I want **my form data preserved if a save fails**,
So that **I don't lose my work and can retry**.

**Acceptance Criteria:**

**Given** I have filled in metadata and clicked Save
**When** the save operation fails (network error, API error, etc.)
**Then** all form data remains in the form exactly as I entered it
**And** the Save button re-enables so I can try again
**And** an error message is displayed (handled in Epic 5)

---

## Epic 5: Error Handling & Resilience

Santiago can recover gracefully when things go wrong without losing work.

### Story 5.1: Save Error Display

As **Santiago**,
I want **to see a clear error message when a save fails**,
So that **I understand what went wrong**.

**Acceptance Criteria:**

**Given** I clicked Save
**When** the save operation fails
**Then** a red toast notification appears: "✗ Save failed: [error message]"
**And** the toast remains visible until I dismiss it
**And** the error message is in plain language (not technical jargon)

### Story 5.2: Retry Save

As **Santiago**,
I want **to retry a failed save operation**,
So that **I can recover from temporary issues**.

**Acceptance Criteria:**

**Given** a save operation has failed
**When** I click the Save button again
**Then** the save operation is attempted again
**And** if it succeeds, the success confirmation appears
**And** my form data was preserved from the previous attempt

### Story 5.3: Skip Problematic Video

As **Santiago**,
I want **to skip a video that has issues and move to the next one**,
So that **one broken video doesn't stop my tagging session**.

**Acceptance Criteria:**

**Given** a video that cannot be saved or has errors
**When** I select a different video from the list
**Then** I can start working on that video instead
**And** my unsaved changes on the previous video are not automatically saved
**And** I can return to the problematic video later if I want

### Story 5.4: Jellyfin Unavailable Handling

As **Santiago**,
I want **to see a clear message when Jellyfin is unavailable**,
So that **I know the issue is with the connection, not my work**.

**Acceptance Criteria:**

**Given** the Jellyfin server is unreachable
**When** the page loads or I try to save
**Then** a clear error message appears: "Could not connect to Jellyfin. Check your connection."
**And** the interface remains responsive (not frozen)
**And** when Jellyfin becomes available again, I can refresh and continue
