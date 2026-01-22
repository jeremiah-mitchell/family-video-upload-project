# Sprint Change Proposal: Welcome Dashboard Redesign

**Date:** 2026-01-22
**Requested by:** Jeremiah
**Impact Level:** Moderate

## Issue Summary

The current main page displays a two-column layout with video list and tagging form, which is optimized for power users but overwhelming for the primary users (Santiago and Armida). The interface needs to be simplified to make video tagging fun and straightforward for non-technical family members.

## Impact Analysis

### Epic Impact
- **Epic 6: Usability Enhancements** - Extended with new stories for welcome dashboard
- No other epics affected

### Artifact Conflicts
- **UX Design Specification** - Requires update for new page structure
- **Architecture** - Minor update for new route `/videos`

### Technical Impact
- New route structure: `/` (dashboard), `/videos` (list+form), `/upload` (existing)
- Refactor existing page.tsx to new videos/page.tsx
- Create new welcome dashboard component

## Recommended Approach

**Direct Adjustment** - Add new stories to Epic 6:

### Story 6.4: Welcome Dashboard Page

As **Santiago or Armida**,
I want **to see a friendly welcome page when I open the app**,
So that **I feel welcomed and know exactly what to do next**.

**Acceptance Criteria:**
- Page displays personalized greeting: "¡Hola Santiago y Armida!"
- Shows progress stats (videos to tag, percentage complete)
- Now Playing section appears prominently when a video is playing
- "Start Watching" section hidden when Now Playing is active
- Mobile-first responsive design with large touch targets
- Navigation to video list via "Browse Videos" button

### Story 6.5: Video List Page Migration

As **Santiago**,
I want **to access the video list and tagging form on a dedicated page**,
So that **the main dashboard stays clean and focused**.

**Acceptance Criteria:**
- Video list and tagging form moved to `/videos` route
- All existing functionality preserved
- Back navigation to welcome dashboard
- Selected video state preserved during session

## Implementation Handoff

**Scope:** Minor - Direct implementation by dev team
**Handoff to:** Development (immediate implementation)

## Approval

- [x] User approved direction
- [x] Proceeding to implementation
