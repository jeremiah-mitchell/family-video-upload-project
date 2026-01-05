# Story 2.2: Video List Display

Status: done

## Story

As **Santiago**,
I want **to see a list of all videos from my Jellyfin library**,
So that **I can choose which video to tag next**.

## Acceptance Criteria

1. **Given** the webapp is loaded
   **When** the page initializes
   **Then** a scrollable list of videos appears in the left panel

2. **Given** videos are loaded from the API
   **When** displaying the video list
   **Then** each video displays its filename

3. **Given** a library of ~1,500 videos
   **When** the page loads
   **Then** the list loads within 2 seconds (NFR2)

4. **Given** the API is unavailable or returns an error
   **When** the page loads
   **Then** an appropriate error message is displayed to the user

## Tasks / Subtasks

- [x] Task 1: Create API client module (AC: #1, #2, #3)
  - [x] Create `apps/web/src/lib/api.ts`
  - [x] Implement `getVideos()` function using fetch
  - [x] Handle API base URL from environment variable `NEXT_PUBLIC_API_URL`
  - [x] Type response using shared `Video` interface and `ApiSuccessResponse`

- [x] Task 2: Create VideoList component (AC: #1, #2)
  - [x] Create `apps/web/src/components/video-list.tsx`
  - [x] Create `apps/web/src/components/video-list.module.css`
  - [x] Display scrollable list of video filenames
  - [x] Implement click handler to select a video (emit via callback prop)
  - [x] Highlight currently selected video row

- [x] Task 3: Create two-column layout on main page (AC: #1)
  - [x] Update `apps/web/src/app/page.tsx` with two-column grid layout
  - [x] Left column: VideoList component (video list panel)
  - [x] Right column: Placeholder for tagging form (Story 2.4)
  - [x] Make layout responsive with CSS Grid

- [x] Task 4: Implement data fetching (AC: #1, #2, #3)
  - [x] Fetch videos on page mount using useEffect
  - [x] Store videos in component state using useState
  - [x] Track loading state for initial load
  - [x] Track selected video state

- [x] Task 5: Implement error handling UI (AC: #4)
  - [x] Display loading indicator during fetch
  - [x] Display error message if API call fails
  - [x] Show connection error for network failures
  - [x] Show appropriate message for empty video list

- [x] Task 6: Verify build and functionality (AC: #1, #2, #3, #4)
  - [x] Run `npm run build` to verify no TypeScript errors
  - [x] Test with running API backend
  - [x] Verify video list displays correctly
  - [x] Verify error states work correctly

## Dev Notes

### Architecture Compliance

This story implements **FR1, FR2, FR3** from the PRD:
- FR1: Santiago can view a list of all untagged videos from the Jellyfin library
- FR2: Santiago can see which videos have already been tagged vs untagged
- FR3: Santiago can identify videos by their filename/thumbnail in the list

Performance requirement **NFR2**: Video list population < 2 seconds

From Architecture document:
- Next.js App Router with `apps/web/src/app/` structure
- CSS Modules for scoped styling
- React useState + useEffect for state management (no external libraries)
- Shared types from `@family-video/shared` package

### File Structure (from Architecture)

```
apps/web/src/
├── app/
│   ├── page.tsx           # Main page with two-column layout
│   ├── page.module.css    # Page-level styles
│   └── layout.tsx         # Root layout (already exists)
├── components/
│   ├── video-list.tsx         # Video list component
│   └── video-list.module.css  # Video list styles
└── lib/
    └── api.ts             # API fetch functions
```

### Naming Conventions (from Architecture)

- Files: kebab-case (`video-list.tsx`, `video-list.module.css`)
- Components: PascalCase (`VideoList`)
- Functions/variables: camelCase (`getVideos`, `selectedVideo`)
- CSS classes in modules: camelCase (`videoList`, `videoItem`, `selected`)

### API Integration

**Backend Endpoint (from Story 2.1):**
- `GET /videos` returns `{ data: Video[], message: string }`
- API runs on port 3001 (configure via `NEXT_PUBLIC_API_URL`)

**Video Interface (from shared package):**
```typescript
interface Video {
  id: string;
  filename: string;
  isTagged: boolean;
  path: string;
  thumbnailUrl?: string;
}
```

**Error Response Pattern:**
```json
{
  "error": "Failed to fetch videos",
  "details": "Could not connect to Jellyfin server"
}
```

### UX Specifications (from UX Design)

**Two-Column Layout:**
- Left panel: Video list (scrollable, ~40% width on desktop)
- Right panel: Tagging form placeholder (Story 2.4)
- Single column on mobile (video list above form)

**Video List Panel:**
- Scrollable container with overflow-y: auto
- Each row shows filename
- Click row to select video
- Selected row has visual highlight (background color change)
- Hover state for interactive feedback

**System Font Stack:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
```

### Component Props

**VideoList Component:**
```typescript
interface VideoListProps {
  videos: Video[];
  selectedVideoId: string | null;
  onVideoSelect: (video: Video) => void;
  isLoading: boolean;
  error: string | null;
}
```

### Environment Variable

Add to `.env.local` for development:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Previous Story Learnings (Story 2.1)

1. **API Response Format**: Success responses wrap data in `{ data: T, message: string }`
2. **Thumbnails**: Available via `/videos/:id/thumbnail` proxy endpoint (API key protected)
3. **Error Types**: Connection errors (503), auth errors (401), generic errors (500)
4. **Video Count**: Library contains ~1,500 videos (no pagination for MVP)

### Performance Considerations

- NFR2 requires < 2 second load time for ~1,500 videos
- No virtualization needed for MVP (per architecture decision)
- Simple fetch on mount pattern is sufficient
- Consider adding loading skeleton for perceived performance

### DO NOT

- Do NOT add pagination (MVP handles 1,500 videos without it per NFR4)
- Do NOT add virtualization (not needed at this scale per Architecture)
- Do NOT use external state management libraries (Redux, Zustand, etc.)
- Do NOT add filtering yet (Story 2.3 handles filter dropdown)
- Do NOT implement tagging form (Story 2.4)
- Do NOT add thumbnail images (can be added as enhancement later)

### References

- [Source: planning-artifacts/architecture.md#Frontend Framework]
- [Source: planning-artifacts/architecture.md#Project Structure]
- [Source: planning-artifacts/ux-design-specification.md#Layout]
- [Source: planning-artifacts/epics.md#Story 2.2]
- [Source: implementation-artifacts/2-1-jellyfin-api-integration.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes

1. **API Client Module** - Implemented `getVideos()` function using native fetch API. Created custom `ApiError` class for structured error handling with status codes and details. Uses `NEXT_PUBLIC_API_URL` environment variable with localhost:3001 fallback.

2. **VideoList Component** - Created presentational component with CSS Modules styling. Handles loading, error, empty, and populated states. Implements click-to-select with visual highlight (blue background) and hover states.

3. **Two-Column Layout** - CSS Grid layout with 50/50 split on desktop, responsive single column on mobile (768px breakpoint). Left panel contains video list, right panel has placeholder for tagging form.

4. **Data Fetching** - useEffect on mount pattern with useState for videos, selectedVideo, isLoading, and error states. Error handling distinguishes between ApiError (server errors) and network errors.

5. **Error Handling UI** - Three distinct states: loading indicator, error message with title/details, and empty state message. Connection errors show user-friendly message.

6. **Build Verification** - Full project build passes with no TypeScript errors. All workspaces (api, web, shared) compile successfully.

## File List

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/lib/api.ts` | Modified | Implemented getVideos() with ApiError class and error handling |
| `apps/web/src/components/video-list.tsx` | Created | VideoList presentational component with all states |
| `apps/web/src/components/video-list.module.css` | Created | CSS Modules styles for video list |
| `apps/web/src/app/page.tsx` | Modified | Two-column layout with data fetching and state management |
| `apps/web/src/app/page.module.css` | Created | CSS Grid layout styles with responsive breakpoint |

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-03 | Story created with comprehensive frontend context | SM Agent |
| 2026-01-03 | Story implemented - all tasks complete, build verified | Dev Agent |
| 2026-01-03 | Code review fixes applied (see below) | Dev Agent |

## Code Review Fixes Applied

The following issues from adversarial code review were addressed:

### HIGH Priority Fixes

1. **Fetch Timeout** - Added 10-second timeout using AbortController in `api.ts` to prevent indefinite hanging on network issues

2. **Keyboard Accessibility** - Added full keyboard navigation to VideoList:
   - `tabIndex={0}` for focusability
   - `role="button"` for screen reader semantics
   - `onKeyDown` handler for Enter/Space selection
   - `aria-selected` state indication
   - `:focus` outline styling in CSS

### MEDIUM Priority Fixes

3. **Layout Ratio** - Changed grid from `1fr 1fr` (50/50) to `2fr 3fr` (~40/60) per UX spec

4. **Loading Skeleton** - Added animated shimmer skeleton loading state instead of plain text

5. **Network Error Detection** - Fixed fragile `err.message.includes('fetch')` with proper `TypeError` check and added `AbortError` handling for timeouts

6. **CSS Variables** - Added theme tokens to `globals.css` and refactored all CSS to use them for maintainability:
   - `--color-*` for colors
   - `--spacing-*` for spacing
   - `--radius-md` for border radius
