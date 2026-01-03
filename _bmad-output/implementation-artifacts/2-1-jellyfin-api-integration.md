# Story 2.1: Jellyfin API Integration

Status: complete

## Story

As a **developer**,
I want **the API to fetch video data from Jellyfin REST API**,
So that **the frontend can display the video library**.

## Acceptance Criteria

1. **Given** valid Jellyfin credentials in environment variables
   **When** the API receives a request to `GET /videos`
   **Then** it returns a list of videos from the configured Jellyfin library

2. **Given** a successful Jellyfin API response
   **When** parsing the video data
   **Then** each video includes id, filename, and tagged status

3. **Given** Jellyfin API returns an error or is unavailable
   **When** the API receives a request to `GET /videos`
   **Then** errors from Jellyfin are handled gracefully with appropriate error responses

## Tasks / Subtasks

- [x] Task 1: Create Jellyfin service module (AC: #1, #2)
  - [x] Create `apps/api/src/jellyfin/jellyfin.service.ts`
  - [x] Create `apps/api/src/jellyfin/jellyfin.module.ts`
  - [x] Create barrel export `apps/api/src/jellyfin/index.ts`
  - [x] Inject AppConfigService to get JELLYFIN_URL and JELLYFIN_API_KEY
  - [x] Implement `getItems()` method to fetch videos from Jellyfin

- [x] Task 2: Implement Jellyfin API authentication (AC: #1)
  - [x] Use `X-Emby-Token` header with API key for authentication
  - [x] Set `Content-Type: application/json` header

- [x] Task 3: Implement video list fetching (AC: #1, #2)
  - [x] Call Jellyfin `/Users/{userId}/Items` endpoint
  - [x] Filter by video types (IncludeItemTypes=Video,Movie,Episode)
  - [x] Parse BaseItemDto response to extract id, name (filename), path
  - [x] Determine tagged status by checking if NFO file exists (via MEDIA_PATH)

- [x] Task 4: Create Videos controller and module (AC: #1, #2, #3)
  - [x] Create `apps/api/src/videos/videos.controller.ts`
  - [x] Create `apps/api/src/videos/videos.service.ts`
  - [x] Create `apps/api/src/videos/videos.module.ts`
  - [x] Create barrel export `apps/api/src/videos/index.ts`
  - [x] Implement `GET /videos` endpoint
  - [x] Return structured response: `{ data: Video[], message: string }`

- [x] Task 5: Create shared Video types (AC: #2)
  - [x] Add `Video` interface to `packages/shared/src/types/video.ts`
  - [x] Include fields: id, filename, path, isTagged, thumbnailUrl (optional)
  - [x] Export from shared package index

- [x] Task 6: Implement error handling (AC: #3)
  - [x] Catch Jellyfin connection errors (network unavailable)
  - [x] Catch Jellyfin authentication errors (invalid API key)
  - [x] Return structured error response: `{ error: string, details: string }`
  - [x] Use appropriate HTTP status codes (500 for Jellyfin errors, 503 for unavailable)

- [x] Task 7: Register modules and verify (AC: #1, #2, #3)
  - [x] Import JellyfinModule and VideosModule in AppModule
  - [x] Verify API builds successfully
  - [x] Test endpoint manually with curl or similar

## Dev Notes

### Architecture Compliance

This story implements **FR1, FR2, FR3, FR4** from the PRD:
- FR1: Santiago can view a list of all untagged videos from the Jellyfin library
- FR2: Santiago can see which videos have already been tagged vs untagged
- FR3: Santiago can identify videos by their filename/thumbnail in the list
- FR4: System retrieves video list from Jellyfin REST API on page load

From Architecture document:
- REST API with structured response patterns
- NestJS service/controller pattern
- Zod validation for data (shared package)
- Error responses: `{ error: string, details: string }`

### Jellyfin API Details

**Authentication:**
- Use `X-Emby-Token` header with API key (simpler than full Authorization header)
- Alternative: `Authorization: MediaBrowser Token="{API_KEY}"`

**Key Endpoints:**
- `GET /Users` - Get user list (need userId for items query)
- `GET /Users/{userId}/Items` - Get items from library
  - Query params: `IncludeItemTypes=Video,Movie,Episode`, `Recursive=true`
  - Returns `Items[]` array of `BaseItemDto` objects

**BaseItemDto Fields (relevant):**
- `Id` - Unique item identifier
- `Name` - Display name
- `Path` - File path on server
- `Type` - Item type (Video, Movie, Episode, etc.)
- `ImageTags.Primary` - For thumbnail URL construction

**Thumbnail URL Pattern:**
- `{JELLYFIN_URL}/Items/{itemId}/Images/Primary?api_key={API_KEY}`

### File Structure (from Architecture)

```
apps/api/src/
├── jellyfin/
│   ├── jellyfin.service.ts    # Jellyfin API client
│   ├── jellyfin.module.ts     # Module registration
│   └── index.ts               # Barrel export
├── videos/
│   ├── videos.controller.ts   # REST endpoints
│   ├── videos.service.ts      # Business logic
│   ├── videos.module.ts       # Module registration
│   └── index.ts               # Barrel export
└── app.module.ts              # Import new modules

packages/shared/src/
├── types/
│   └── video.ts               # Video interface
└── index.ts                   # Export video types
```

### Naming Conventions (from Architecture)

- Files: kebab-case (`jellyfin.service.ts`)
- Classes: PascalCase (`JellyfinService`)
- Functions/variables: camelCase (`getVideos`, `videoId`)
- Types/interfaces: PascalCase (`Video`, `JellyfinItem`)

### API Response Patterns (from Architecture)

**Success Response:**
```json
{
  "data": [...],
  "message": "Retrieved 1500 videos from Jellyfin"
}
```

**Error Response:**
```json
{
  "error": "Failed to fetch videos",
  "details": "Could not connect to Jellyfin server"
}
```

### Tagged Status Detection

To determine if a video is tagged:
1. Get video file path from Jellyfin response
2. Construct NFO file path: replace video extension with `.nfo`
3. Check if NFO file exists using `fs.existsSync()` against MEDIA_PATH mount

Example:
- Video path: `/media/Family Videos/birthday-2023.mp4`
- NFO path: `/media/Family Videos/birthday-2023.nfo`
- Check: `fs.existsSync('/media/Family Videos/birthday-2023.nfo')`

### Previous Story Learnings (Epic 1)

From Story 1.2 (Environment Variables):
- Environment variables are validated via Zod at startup
- AppConfigService provides typed access to JELLYFIN_URL, JELLYFIN_API_KEY, MEDIA_PATH
- Inject `AppConfigService` to access configuration

From Story 1.3 (Docker Compose):
- Health endpoint exists at `/health` for container monitoring
- API runs on port 3001
- MEDIA_PATH is mounted as `/media` in container

### Performance Requirements

- NFR2: Video list population < 2 seconds
- Library size: ~1,500 videos (no pagination for MVP per NFR4)

### DO NOT

- Do NOT add pagination (MVP handles 1,500 videos without it per NFR4)
- Do NOT add caching (not needed at this scale per Architecture)
- Do NOT add authentication (Cloudflare Access handles this externally)
- Do NOT use external HTTP libraries - use built-in fetch or NestJS HttpModule
- Do NOT expose API key to frontend - keep it in backend only

### References

- [Source: planning-artifacts/architecture.md#API & Communication]
- [Source: planning-artifacts/architecture.md#Project Structure]
- [Source: planning-artifacts/epics.md#Story 2.1]
- [Source: Jellyfin API Overview](https://jmshrv.com/posts/jellyfin-api/)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **JellyfinService** - Uses native fetch API with X-Emby-Token header for authentication. Gets first user ID from /Users endpoint, then fetches items from /Users/{userId}/Items.

2. **Tagged status detection** - Uses fs.existsSync to check for NFO file by replacing video extension with .nfo. Path mapping converts Jellyfin absolute paths to container-relative paths using MEDIA_PATH.

3. **Error handling** - Controller catches errors and maps to appropriate HTTP status codes: 503 for connection errors, 401 for auth errors, 500 for generic errors.

4. **Thumbnail URLs** - Proxied through `/videos/:id/thumbnail` endpoint to avoid exposing API key to frontend (NFR6 compliance).

5. **Type assertion for fetch** - Used `as` type assertions for response.json() since modern TypeScript returns `unknown`.

6. **Request timeouts** - All Jellyfin API requests have 10-second timeout via AbortController (5s for thumbnails).

### Code Review Fixes Applied

| Issue | Severity | Fix Applied |
|-------|----------|-------------|
| NFO path mapping broken | HIGH | Added `mapToContainerPath()` to convert Jellyfin paths to MEDIA_PATH-relative paths |
| API key exposed in thumbnail URLs | HIGH | Created `/videos/:id/thumbnail` proxy endpoint; thumbnail URLs no longer contain API key |
| No fetch timeout | MEDIUM | Added AbortController with 10s timeout for API calls, 5s for thumbnails |
| Debug logs expose URLs | MEDIUM | Sanitized log messages to not include full URLs |

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-03 | Story created with comprehensive Jellyfin API context | SM Agent |
| 2026-01-03 | Story implemented - all tasks complete | Dev Agent |
| 2026-01-03 | Code review: Fixed 2 HIGH, 2 MEDIUM issues | Code Review Agent |

### File List

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/jellyfin/jellyfin.service.ts` | Created | Jellyfin API client with auth, item fetching, thumbnail proxy, and timeouts |
| `apps/api/src/jellyfin/jellyfin.module.ts` | Created | Jellyfin module registration |
| `apps/api/src/jellyfin/index.ts` | Created | Barrel export for jellyfin module |
| `apps/api/src/videos/videos.service.ts` | Created | Video business logic with path mapping and tagged status detection |
| `apps/api/src/videos/videos.controller.ts` | Created | GET /videos endpoint, thumbnail proxy, error handling |
| `apps/api/src/videos/videos.module.ts` | Created | Videos module registration |
| `apps/api/src/videos/index.ts` | Created | Barrel export for videos module |
| `apps/api/src/app.module.ts` | Modified | Added JellyfinModule and VideosModule imports |
| `packages/shared/src/types/video.ts` | Modified | Added thumbnailUrl field to Video interface |

