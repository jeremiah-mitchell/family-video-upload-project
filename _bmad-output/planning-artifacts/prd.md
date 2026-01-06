---
stepsCompleted: [1, 2, 3, 4, 7, 8, 9, 10, 11]
inputDocuments:
  - "planning-artifacts/product-brief-family-video-upload-project-2026-01-02.md"
  - "planning-artifacts/research/technical-jellyfin-plugin-research-2026-01-02.md"
  - "analysis/brainstorming-session-2026-01-02.md"
workflowType: 'prd'
lastStep: 11
briefCount: 1
researchCount: 1
brainstormingCount: 1
projectDocsCount: 0
status: complete
---

# Product Requirements Document - family-video-upload-project

**Author:** Jeremiah
**Date:** 2026-01-02

## Executive Summary

Family-video-upload-project is a metadata tagging webapp that enables a non-technical family member to catalog ~1,500 home video clips from DVDs, making them discoverable through an existing Jellyfin media server. The solution bridges the gap between inaccessible physical media and modern streaming convenience, preserving family memories for current and future generations.

The core problem: Approximately 70-100 DVDs containing irreplaceable family memories sit inaccessible - finalized DVDs require manual playback with no discoverability, unfinalized DVDs are completely inaccessible without technical extraction, and the only person who knows the video contents (Santiago) has no practical way to capture that knowledge.

This PRD defines the requirements for a standalone webapp with a radically simplified interface: display untagged videos, link to Jellyfin for playback, provide 6 metadata fields (title, date, people, tags, rating, description), and save as NFO files that Jellyfin automatically reads.

### What Makes This Special

- **Single-purpose simplicity:** Not a general media manager - built specifically for the "watch and tag" workflow
- **Non-technical user as primary design constraint:** If Santiago can't use it without help, it fails
- **Jellyfin-native integration:** Uses existing infrastructure (REST API + NFO files), no proprietary formats
- **Remote-friendly:** Santiago can tag from anywhere with Jellyfin access
- **Success defined by independence:** The primary metric is Santiago using it correctly without assistance

## Project Classification

**Technical Type:** web_app
**Domain:** general (home media management)
**Complexity:** low
**Project Context:** Greenfield - new project

This is a straightforward single-page web application with standard requirements:
- Browser-based interface (laptop-first for Santiago)
- Integration with Jellyfin REST API for video listing
- NFO file generation for metadata persistence
- No complex compliance, security, or regulatory requirements
- Primary technical concerns: API integration, file handling, user experience simplicity

## Success Criteria

### User Success

**Santiago (Primary Tagger):**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Zero-confusion onboarding | Tags first video without guidance | Observation during first session |
| Session completion | Finishes sessions without abandoning | No mid-session complaints or confusion |
| Return usage | Voluntarily returns for additional sessions | Multiple sessions over time |
| Task efficiency | Under 2 minutes per tag (excluding watch time) | Simple enough that tagging doesn't feel like work |
| Independence | Uses webapp without assistance | No support requests after initial walkthrough |

**Family Viewers (Secondary):**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Discoverability | Videos findable by title and date | Metadata displays correctly in Jellyfin |
| Enjoyment | Family watches and enjoys tagged videos | Anecdotal feedback |

### Business Success

This is a personal/family project with no revenue targets. Success is measured by:

- **Any progress:** Moving from 0 tagged videos to any tagged videos is success
- **No deadline pressure:** Santiago works at his own pace - there's no timeline
- **Enjoyable experience:** Santiago finds tagging fun, not tedious
- **Knowledge capture:** Family history preserved before it's lost

### Technical Success

| Metric | Target |
|--------|--------|
| NFO file generation | Files written correctly in Jellyfin-compatible XML format |
| Jellyfin integration | All 6 metadata fields (title, date, people, tags, rating, description) display in Jellyfin |
| API reliability | Video list loads consistently from Jellyfin REST API |
| Data persistence | No metadata loss - NFO files are the source of truth |

### Measurable Outcomes

**Primary KPI:** Santiago Independence Score
- 0 = Requires constant help
- 1 = Needs occasional guidance
- 2 = Uses independently with rare questions
- 3 = Fully independent, teaches others

**Target:** Score of 2+ within first week of use

## Product Scope

### MVP - Minimum Viable Product

Core workflow: List → Watch → Tag → Save → Next

| Feature | Description |
|---------|-------------|
| Video list | Display untagged videos from Jellyfin library |
| Jellyfin link | Click to open video in Jellyfin for viewing |
| 6 metadata fields | Title, Date, People, Tags, Rating, Description |
| Save to NFO | Write metadata as Jellyfin-compatible NFO file |
| Refresh trigger | Tell Jellyfin to re-scan after save |

**MVP Success Criteria:**
- Santiago tags a video end-to-end without help
- NFO files are written correctly
- All 5 fields display in Jellyfin
- Workflow feels simple: list → watch → tag → save → next

### Growth Features (Post-MVP)

**V1 Enhancements:**
- Carry-forward defaults (copy previous video's people/date to next)
- Bulk tagging for videos from same session
- Progress indicator (X of 1,500 tagged)

### Vision (Future)

**V2+ Possibilities:**
- Auto-rename/move files on save
- Mobile-responsive design
- Embedded video preview (skip Jellyfin tab)
- Location/event dropdown with saved presets
- Family member management UI

## User Journeys

### Journey 1: Santiago - A Typical Tagging Session

Santiago settles into his chair with his morning coffee, opens his laptop, and navigates to the family video tagger webapp. He's been doing this for a few weeks now and has developed a comfortable rhythm.

The webapp shows him a list of untagged videos from the "Santiago y Armida Productions" library. He recognizes the thumbnail of one - it's from that birthday party at the old house. He clicks the video title and a new tab opens to Jellyfin, where the video starts playing.

As he watches, memories flood back. That's little Maria blowing out her candles. His mother-in-law is there, still healthy and laughing. He pauses the video, switches back to the tagger tab, and fills in the fields:
- **Title:** "Maria's 5th Birthday - Candles & Cake"
- **Date:** 2003-06-15 (he remembers because it was right after school ended)
- **People:** Maria, Grandma Rosa, himself behind the camera
- **Rating:** 8 (great memory, decent video quality)
- **Description:** "Maria blows out candles at her 5th birthday party at the Elm Street house. Grandma Rosa helps cut the cake."

He clicks Save. A brief "Saved!" confirmation appears. The video moves to the "tagged" section, and the next untagged video is ready. Santiago takes another sip of coffee and clicks the next one.

Two hours later, he's tagged 30 videos and discovered some footage he'd completely forgotten about. He closes the laptop feeling satisfied - he's preserving memories for his grandchildren to see someday.

### Journey 2: Santiago - When Something Goes Wrong

Santiago is halfway through his tagging session when he clicks a video and... nothing happens. The Jellyfin tab opens but shows an error - "Media not found."

He frowns, then notices the video filename looks corrupted - something went wrong during the DVD extraction. He can't tag what he can't watch. Santiago clicks the "Skip" button (or simply moves to the next video in the list), making a mental note to tell Jeremiah about the broken file.

Later that day, he's tagging another video when his internet briefly drops. He fills in all the fields and clicks Save, but gets an error message: "Could not save - check your connection." When his internet comes back a moment later, he clicks Save again, and this time it works. His data wasn't lost because it stayed in the form until successfully saved.

By the end of the session, he's encountered three broken videos and one save retry, but tagged 25 others without issue. He mentions the broken files to Jeremiah, who can investigate the extraction pipeline later.

### Journey 3: Jeremiah - Initial Setup

Jeremiah has just finished extracting all the DVDs and has ~1,500 video clips sitting in a folder on his NAS. He's ready to deploy the tagging webapp.

He pulls up the GitHub repo, reads the README, and starts the Docker container on his Proxmox VM. Configuration is minimal - he just needs to point it at his Jellyfin server URL and provide an API key. A few minutes later, the webapp is running.

He opens it in a browser to test. The video list populates from Jellyfin. He tags one test video, checks Jellyfin, and confirms the metadata appears correctly. Perfect.

Now comes the handoff. He video calls Santiago, shares his screen, and shows him the webapp. "Just open this URL, pick a video, watch it in Jellyfin, fill in these fields, and hit Save. That's it."

Santiago gets it immediately. Within five minutes, he's tagged his first video on his own. Jeremiah watches one more to make sure, then says "You're good - call me if anything breaks." He closes the call feeling confident.

Over the next few months, Jeremiah checks in occasionally. Santiago hasn't needed help. The webapp just works. Mission accomplished.

### Journey 4: Family Viewers - Discovering Old Memories

It's Sunday evening and Jeremiah's kids are bored. "Can we watch something?" they ask. Jeremiah opens Jellyfin on the TV and scrolls to "Santiago y Armida Productions."

Thanks to Santiago's tagging work, the library now shows recognizable titles instead of cryptic filenames. "Maria's 5th Birthday" catches his eye - his daughter Maria is now 25.

"Hey, want to see Mom when she was your age?" he asks the kids. They gather around as the video plays. There's Maria as a kindergartener, blowing out candles. The kids giggle at her hairstyle. "That's really Mommy?"

They spend the next hour browsing through tagged videos, discovering family moments they never knew existed. Grandma Rosa appears in several - she passed away before the youngest kids were born, but now they can see her laughing, talking, being part of the family.

Maria calls later that week. "Dad sent me a link to my 5th birthday video. I completely forgot about that party. Thank you for making these accessible."

### Journey Requirements Summary

These journeys reveal the following required capabilities:

**Core Tagging Interface (Santiago Happy Path):**
- Display list of untagged videos from Jellyfin library
- Link to open video in Jellyfin
- Input fields for all 5 metadata types
- Save functionality with NFO generation
- Jellyfin library refresh trigger
- Visual confirmation of successful save
- Clear indication of which videos are tagged vs untagged

**Error Handling (Santiago Edge Cases):**
- Graceful handling when video is inaccessible
- Ability to skip/defer problematic videos
- Form state preservation during network issues
- Retry capability after connection recovery
- Clear error messaging (not technical jargon)

**Administration (Jeremiah Setup):**
- Simple deployment (Docker container)
- Minimal configuration (Jellyfin URL + API key)
- No ongoing maintenance required
- Logging for troubleshooting if needed

**Viewer Experience (Family Discovery):**
- All metadata displays correctly in Jellyfin
- Videos browsable by title, date, people
- No action required from the tagger webapp

## Web Application Requirements

### Project-Type Overview

This is a single-page web application (SPA) designed for a single primary user (Santiago) accessing from a laptop browser. The webapp is accessed via `syap.losbisquets.xyz`, protected by Cloudflare Access with MFA - the webapp itself requires no authentication logic.

### Technical Architecture Considerations

**Application Architecture:**
- Single Page Application (SPA) - no full page reloads during tagging workflow
- Static frontend served from Docker container
- Backend API for Jellyfin communication and NFO file writing
- **No authentication required in app** - Cloudflare Access handles MFA before traffic reaches the webapp

**Access & Security:**
| Layer | Handled By |
|-------|------------|
| Domain | `syap.losbisquets.xyz` |
| DNS/Proxy | Cloudflare |
| Authentication | Cloudflare Access (MFA) |
| Tunnel | Existing cloudflared appliance on Proxmox |
| Webapp | No auth needed - trusts Cloudflare-authenticated requests |

**Browser Support:**
| Browser | Support Level |
|---------|---------------|
| Chrome (latest) | Full support |
| Firefox (latest) | Full support |
| Safari (latest) | Full support |
| Edge (latest) | Full support |
| IE11 | Not supported |
| Mobile browsers | Not targeted (laptop-first) |

**Responsive Design:**
- Primary target: Laptop/desktop (1280px+ width)
- Tablet/mobile: Not a priority (Santiago uses laptop)

**Performance Targets:**
| Metric | Target |
|--------|--------|
| Initial page load | < 3 seconds |
| Video list population | < 2 seconds |
| Save operation | < 1 second (perceived) |

**SEO Strategy:**
Not applicable - private webapp behind Cloudflare Access.

**Accessibility:**
- Basic accessibility (WCAG 2.1 Level A)
- Semantic HTML, form labels, keyboard navigation
- No complex requirements (single known user)

### Implementation Considerations

**Deployment:**
- Docker container on Proxmox VM
- Exposed to Cloudflare Tunnel (existing cloudflared appliance)
- Environment variables: Jellyfin URL, API key, media path
- No database - NFO files are the persistence layer

**Security:**
- **Webapp has no authentication code** - Cloudflare Access MFA protects the endpoint
- Jellyfin API key stored in environment variables
- All traffic encrypted via Cloudflare Tunnel
- Minimal attack surface (single purpose, single user)

**Integration Points:**
- Jellyfin REST API (read: video list, library info)
- File system access (write: NFO files in media directory)
- Jellyfin library refresh trigger (POST to refresh endpoint)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Solve the core problem (Santiago can't easily tag home videos for Jellyfin) with minimal features
- Single user, single purpose, no unnecessary complexity
- Success measured by user independence, not feature count

**Resource Requirements:**
- Solo developer (Jeremiah)
- Estimated effort: Small project (days to weeks, not months)
- No external dependencies beyond existing infrastructure (Jellyfin, Cloudflare, Proxmox)

### MVP Feature Set (Phase 1)

**Core User Journey Supported:** Santiago's tagging workflow

**Must-Have Capabilities:**
| Feature | Why Essential |
|---------|---------------|
| Video list from Jellyfin | Can't tag without seeing what's available |
| Jellyfin playback link | Can't tag without watching |
| 6 metadata fields | Core data capture (title, date, people, tags, rating, description) |
| NFO file generation | Jellyfin can't read metadata without it |
| Library refresh trigger | Metadata won't appear until Jellyfin re-scans |
| Save confirmation | Santiago needs feedback that it worked |
| Error messaging | Santiago needs to know when something fails |

**Explicitly Out of Scope for MVP:**
- Bulk tagging
- Carry-forward defaults
- Progress tracking
- Mobile support
- Embedded video player
- Family member management UI

### Post-MVP Features

**Phase 2 (V1 Enhancements):**
- Carry-forward defaults (copy people/date from previous video)
- Progress indicator (X of 1,500 tagged)
- Bulk tagging for videos from same session

**Phase 3 (V2+ Possibilities):**
- Auto-rename/move files on save
- Mobile-responsive design
- Embedded video preview
- Location/event presets
- Family member management

### Risk Mitigation Strategy

**Technical Risks:**
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Jellyfin API changes | Low | Pin to known working version, monitor updates |
| NFO format compatibility | Low | Test with Jellyfin before building full UI |
| File system permissions | Medium | Document required permissions in setup guide |

**User Risks:**
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Santiago finds it confusing | Medium | User test before full deployment, iterate on UX |
| Santiago loses interest | Low | No pressure - make it enjoyable, not a chore |

**Resource Risks:**
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Jeremiah runs out of time | Medium | Keep MVP minimal - can be built in spare time |
| Scope creep | Medium | Strict MVP boundaries - future features are future |

## Functional Requirements

### Video Discovery & Display

- FR1: Santiago can view a list of all untagged videos from the Jellyfin library
- FR2: Santiago can see which videos have already been tagged vs untagged
- FR3: Santiago can identify videos by their filename/thumbnail in the list
- FR4: System retrieves video list from Jellyfin REST API on page load

### Video Playback

- FR5: Santiago can click a video to open it in Jellyfin for playback
- FR6: System opens Jellyfin playback in a new browser tab
- FR7: Santiago can return to the tagger after watching without losing form state

### Metadata Entry

- FR8: Santiago can enter a title for the video
- FR9: Santiago can select a date for when the video was filmed (pre-filled from video creation date when available)
- FR10: Santiago can select one or more people who appear in the video
  - UI displays familiar short names (e.g., "Santiago")
  - NFO stores full names for Jellyfin actor display (e.g., "Santiago Arcaraz")
- FR10a: Santiago can select one or more tags to categorize the video (Christmas, Mexico, Family, Birthday, Vacation, Holiday, School, Sports)
- FR11: Santiago can assign a rating (1-10) to the video
- FR12: Santiago can enter a free-text description of the video content
- FR13: Santiago can view previously entered metadata for a video (if editing)

### Data Persistence

- FR14: System saves metadata as an NFO file in Jellyfin-compatible XML format
- FR15: System writes NFO file to the same directory as the video file
- FR16: System triggers Jellyfin library refresh after saving
- FR17: Santiago receives visual confirmation when save succeeds
- FR18: System preserves form data if save fails (allowing retry)

### Error Handling

- FR19: Santiago receives clear error messages when operations fail
- FR20: Santiago can retry a failed save operation
- FR21: Santiago can skip a problematic video and continue with the next one
- FR22: System handles Jellyfin API unavailability gracefully

### Administration & Configuration

- FR23: Jeremiah can configure Jellyfin server URL via environment variable
- FR24: Jeremiah can configure Jellyfin API key via environment variable
- FR25: Jeremiah can configure the media directory path via environment variable
- FR26: Jeremiah can deploy the application as a Docker container

## Non-Functional Requirements

### Performance

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| NFR1: Initial page load | < 3 seconds | Santiago shouldn't wait to start working |
| NFR2: Video list population | < 2 seconds | Quick access to untagged videos |
| NFR3: Save operation feedback | < 1 second perceived | Immediate confirmation prevents confusion |
| NFR4: Handle 1,500+ video library | No pagination required for MVP | Full list is manageable at this scale |

### Security

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| NFR5: Authentication | Handled by Cloudflare Access (MFA) | Webapp has no auth code |
| NFR6: API key protection | Stored in environment variables, never exposed to browser | Jellyfin access security |
| NFR7: Transport encryption | All traffic via Cloudflare Tunnel (HTTPS) | Data in transit protection |

### Reliability

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| NFR8: Data persistence | NFO files are authoritative; no data loss on webapp restart | Santiago's work must be preserved |
| NFR9: Form state preservation | Unsaved form data survives network interruptions | Prevents rework on transient failures |
| NFR10: Graceful degradation | Clear error messages when Jellyfin is unavailable | Santiago knows what's wrong |

### Accessibility

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| NFR11: Basic accessibility | WCAG 2.1 Level A compliance | Good practice, helps Santiago if needed |
| NFR12: Keyboard navigation | All form fields accessible via keyboard | Standard web accessibility |
| NFR13: Form labels | All inputs have visible, descriptive labels | Clarity for Santiago |

### Integration

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| NFR14: Jellyfin API compatibility | Works with Jellyfin 10.11+ | Current stable version support |
| NFR15: NFO format compliance | Generates valid Jellyfin-compatible XML | Metadata displays correctly |
| NFR16: Library refresh | Triggers Jellyfin scan after save | Metadata appears without manual intervention |
