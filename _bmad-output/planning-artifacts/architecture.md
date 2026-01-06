---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-01-02'
inputDocuments:
  - "planning-artifacts/prd.md"
  - "planning-artifacts/ux-design-specification.md"
  - "planning-artifacts/product-brief-family-video-upload-project-2026-01-02.md"
  - "planning-artifacts/research/technical-jellyfin-plugin-research-2026-01-02.md"
  - "analysis/brainstorming-session-2026-01-02.md"
workflowType: 'architecture'
project_name: 'family-video-upload-project'
user_name: 'Jeremiah'
date: '2026-01-02'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 26 FRs across 6 capability areas
- Video Discovery & Display (4 FRs)
- Video Playback (3 FRs)
- Metadata Entry (6 FRs)
- Data Persistence (5 FRs)
- Error Handling (4 FRs)
- Administration (4 FRs)

**Non-Functional Requirements:** 16 NFRs (adjusted priorities)
- **Save Confirmation: CRITICAL** - Santiago must know saves succeeded
- Performance: <3s load, <2s list, <1s save feedback
- Security: Cloudflare Access (external), API key protection
- Accessibility: WCAG 2.1 Level A
- Integration: Jellyfin 10.11+, NFO XML format
- Uptime: Not critical - manual restart acceptable

### Scale & Complexity

| Factor | Value |
|--------|-------|
| Complexity | Low |
| Domain | Web application (SPA + API) |
| Users | Single user (Santiago) |
| Data | ~1,500 videos, no database |
| Real-time | None |
| Auth | External (Cloudflare Access) |

### Technical Constraints

- Must integrate with Jellyfin REST API
- Must write NFO files in Jellyfin-compatible XML format
- Must deploy as Docker container on Proxmox
- No authentication code in app (Cloudflare handles)
- Laptop-first (1280px+ width)

### Critical Design Principle

**Data persistence confirmation is the top priority.** Santiago should never lose work because he thought something saved when it didn't. Clear, unmistakable save confirmation is essential. Uptime/availability issues are acceptable - Jeremiah can debug manually if Santiago reports the app is down.

## Technology Stack

### Selected Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js (React + TypeScript) | Familiar stack, good DX |
| **Backend** | NestJS (TypeScript) | Structured API layer, TypeScript throughout |
| **Monorepo** | npm workspaces | Simple, no extra tooling overhead |
| **Deployment** | Docker Compose | Multi-container orchestration on Proxmox |

### Project Structure

```
/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App router pages
│   │   │   └── components/  # React components
│   │   ├── Dockerfile
│   │   └── package.json
│   └── api/                 # NestJS backend
│       ├── src/
│       │   ├── jellyfin/    # Jellyfin API integration
│       │   ├── nfo/         # NFO file writing
│       │   └── videos/      # Video endpoints
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared/              # Shared types/utils
│       └── package.json
├── docker-compose.yml
└── package.json             # Workspace root
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare                           │
│              (DNS + Access MFA)                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              cloudflared tunnel                         │
│                (Proxmox)                                │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Docker Compose                             │
│  ┌─────────────────┐    ┌─────────────────┐            │
│  │   web (Next.js) │───▶│   api (NestJS)  │            │
│  │    Port 3000    │    │    Port 3001    │            │
│  └─────────────────┘    └────────┬────────┘            │
│                                  │                      │
└──────────────────────────────────┼──────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
          ┌─────────────────┐            ┌─────────────────┐
          │  Jellyfin API   │            │   NAS (media)   │
          │   (existing)    │            │   NFO files     │
          └─────────────────┘            └─────────────────┘
```

### Environment Configuration

```yaml
# docker-compose.yml environment variables
api:
  JELLYFIN_URL: "http://jellyfin:8096"
  JELLYFIN_API_KEY: "${JELLYFIN_API_KEY}"
  MEDIA_PATH: "/media"  # Mounted volume

web:
  API_URL: "http://api:3001"
```

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- API Design Pattern → REST (standard, simple)
- State Management → React useState + fetch (simplest approach)
- Styling → CSS Modules (scoped, no dependencies)

**Already Decided (From Starter/Preferences):**
- Language: TypeScript
- Frontend: Next.js
- Backend: NestJS
- Monorepo: npm workspaces
- Auth: None (Cloudflare Access external)
- Deployment: Docker Compose

**Deferred/Not Applicable:**
- Database: None (NFO files only)
- Caching: Not needed at this scale
- Real-time: Not required

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | None | Data stored in NFO XML files alongside videos |
| Data Validation | Zod | TypeScript-native, shared between frontend/backend |
| File Writing | Atomic writes | Write to temp file, then rename (prevents corruption) |

### Family Member Name Mapping

| UI Display | NFO Actor Name |
|------------|----------------|
| Santiago | Santiago Arcaraz |
| Armida | Armida Arcaraz |
| Fernanda | Fernanda Arcaraz Mitchell |
| Mariana | Mariana Arcaraz |
| Tita | Tita |
| Jeremiah | Jeremiah Arcaraz Mitchell |
| Eric | Eric Peyton |
| Lucia | Lucia Arcaraz |
| Sofia | Sofia Arcaraz Mitchell |

**Implementation:** Frontend displays short names for easy selection. On save, the API maps to full names before writing to NFO `<actor>` tags.

### Video Date Handling

- **Source:** Jellyfin `DateCreated` or `PremiereDate` (if NFO exists)
- **Pre-fill:** Form auto-populates date from video's `dateCreated` field
- **Storage:** Saved to NFO `<premiered>` tag in YYYY-MM-DD format
- **Display:** Jellyfin shows year extracted from premiered date

### Tags System

Tags are predefined categories for organizing home videos:
- Christmas, Mexico, Family, Birthday, Vacation, Holiday, School, Sports

Tags are stored in NFO as `<tag>` elements and displayed in Jellyfin's tag view.

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authentication | None in app | Cloudflare Access handles this externally |
| API Key Protection | Environment variable | Jellyfin API key stored in .env, never exposed to frontend |
| CORS | Same-origin | Frontend and API served from same domain |

### API & Communication

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Style | REST | Standard, simple, NestJS native |
| Error Handling | Standard HTTP codes + message | 200/400/500 with JSON error body |
| API Documentation | None | Single user, small API surface |

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State Management | React useState + fetch | Simplest approach, no external dependencies |
| Styling | CSS Modules | Scoped styles, no build config needed |
| Forms | Native HTML forms | Simple validation, no library needed |
| Component Structure | Flat | Few components, no complex hierarchy needed |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Docker Compose on Proxmox | Already established infrastructure |
| CI/CD | None | Manual deployment, single developer |
| Logging | Console.log | Docker captures stdout, sufficient for debugging |
| Monitoring | None | Manual restart acceptable per requirements |

### Decision Impact Analysis

**Implementation Sequence:**
1. Project initialization (Next.js + NestJS monorepo)
2. Jellyfin API integration module
3. NFO file writing module
4. Frontend video list + form
5. Save confirmation UX
6. Docker containerization

**Cross-Component Dependencies:**
- Shared types package defines Video, Metadata interfaces
- API validates with Zod, same schemas shared to frontend
- Save confirmation flows from API response → frontend toast

## Implementation Patterns & Consistency Rules

### Naming Patterns

**API Naming:**
- Endpoints: plural nouns (`/videos`, `/videos/:id`)
- Route params: `:id` format (NestJS default)
- Query params: camelCase (`?includeTagged=true`)

**Code Naming:**
- Files: kebab-case (`video-list.tsx`, `jellyfin.service.ts`)
- Components: PascalCase (`VideoList`, `TaggingForm`)
- Functions/variables: camelCase (`getVideos`, `videoId`)
- Types/interfaces: PascalCase (`Video`, `VideoMetadata`)

**CSS:**
- CSS Modules: camelCase classes (`styles.videoCard`)
- File naming: `component-name.module.css`

### Structure Patterns

**Frontend (Next.js App Router):**
```
apps/web/src/
├── app/
│   ├── page.tsx           # Main page
│   └── layout.tsx         # Root layout
├── components/
│   ├── video-list.tsx
│   ├── video-list.module.css
│   ├── tagging-form.tsx
│   └── tagging-form.module.css
└── lib/
    └── api.ts             # API fetch functions
```

**Backend (NestJS):**
```
apps/api/src/
├── main.ts
├── app.module.ts
├── videos/
│   ├── videos.controller.ts
│   ├── videos.service.ts
│   └── videos.module.ts
├── jellyfin/
│   ├── jellyfin.service.ts
│   └── jellyfin.module.ts
└── nfo/
    ├── nfo.service.ts
    └── nfo.module.ts
```

### API Response Patterns

**Success Response:**
```json
{
  "data": { ... },
  "message": "Video metadata saved successfully"
}
```

**Error Response:**
```json
{
  "error": "Failed to save metadata",
  "details": "NFO file write failed"
}
```

**HTTP Status Codes:**
- 200: Success
- 400: Bad request (validation error)
- 500: Server error

### Error Handling Patterns

**Frontend:**
- Display errors in toast notification
- Clear errors after 5 seconds
- Log errors to console for debugging

**Backend:**
- Return structured error responses
- Log full error details to console
- Never expose stack traces to client

### Save Confirmation Pattern (Critical)

**Flow:**
1. User clicks Save → Button shows "Saving..."
2. API writes NFO file atomically (temp file → rename)
3. API returns success with message
4. Frontend shows green toast: "✓ Saved: [video title]"
5. Toast persists 3 seconds

**On Error:**
1. Frontend shows red toast: "✗ Save failed: [error message]"
2. Save button re-enables
3. Form data preserved (no data loss)
4. Toast persists until dismissed

## Complete Project Structure

```
family-video-upload-project/
├── README.md
├── package.json                 # Workspace root
├── docker-compose.yml
├── .env.example
├── .gitignore
├── apps/
│   ├── web/                     # Next.js frontend
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx
│   │       │   └── globals.css
│   │       ├── components/
│   │       │   ├── video-list.tsx
│   │       │   ├── video-list.module.css
│   │       │   ├── tagging-form.tsx
│   │       │   ├── tagging-form.module.css
│   │       │   ├── toast.tsx
│   │       │   └── toast.module.css
│   │       └── lib/
│   │           └── api.ts
│   └── api/                     # NestJS backend
│       ├── package.json
│       ├── nest-cli.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── videos/
│           │   ├── videos.controller.ts
│           │   ├── videos.service.ts
│           │   └── videos.module.ts
│           ├── jellyfin/
│           │   ├── jellyfin.service.ts
│           │   └── jellyfin.module.ts
│           └── nfo/
│               ├── nfo.service.ts
│               └── nfo.module.ts
└── packages/
    └── shared/                  # Shared types
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            ├── types/
            │   ├── video.ts
            │   └── metadata.ts
            └── schemas/
                └── metadata.schema.ts   # Zod schemas
```

### Architectural Boundaries

**API Endpoints:**
- `GET /videos` - List all videos from Home Videos library (from Jellyfin API)
- `GET /videos/:id` - Get single video details
- `GET /videos/:id/metadata` - Get existing metadata for a video
- `POST /videos/:id/metadata` - Save metadata (writes NFO file)
- `GET /videos/:id/thumbnail` - Proxy thumbnail image from Jellyfin
- `GET /videos/config` - Get Jellyfin URL for frontend
- `GET /now-playing` - Get currently playing video for configured user (Jellyfin Sessions API)

**Data Flow:**
1. Frontend fetches video list from API
2. API proxies to Jellyfin for video data
3. User edits metadata in form
4. API validates with Zod, writes NFO file atomically
5. API returns success/error response
6. Frontend displays confirmation toast

**External Integrations:**
- Jellyfin REST API (read video library, Sessions API for Now Playing)
- NAS filesystem (write NFO files via mounted volume)

**Frontend Routes:**
- `/` - Main tagging page (video list + form)
- `/upload` - Upload page stub (placeholder for future functionality)

## Architecture Validation

### Coherence Check ✅

- Next.js + NestJS + TypeScript work together seamlessly
- npm workspaces provides simple monorepo management
- Docker Compose handles multi-container orchestration
- No conflicts between technology choices

### Requirements Coverage ✅

| Requirement Area | Architectural Support |
|------------------|----------------------|
| Video Discovery | Jellyfin API integration via NestJS service |
| Video Playback | Link to Jellyfin external player |
| Metadata Entry | React form → API → NFO file |
| Data Persistence | Atomic NFO file writes |
| Error Handling | Structured API responses + toast UI |
| Save Confirmation | Toast notifications (critical) |

### Implementation Readiness ✅

- All technology versions are standard/current
- Implementation patterns are specific and actionable
- Project structure is complete with all files listed
- No ambiguity in architectural decisions

## Architecture Completion Summary

**Status:** READY FOR IMPLEMENTATION ✅

**Architecture Decisions Made:** 15
**Implementation Patterns Defined:** 8
**Components Specified:** 3 (web, api, shared)

### Implementation Sequence

1. **Project Setup**
   ```bash
   mkdir family-video-upload-project && cd family-video-upload-project
   npm init -y
   # Configure npm workspaces in package.json
   ```

2. **Initialize Apps**
   ```bash
   npx create-next-app@latest apps/web --typescript --app
   npx @nestjs/cli new apps/api
   mkdir -p packages/shared/src
   ```

3. **Docker Configuration**
   - Create Dockerfiles for web and api
   - Create docker-compose.yml with volume mounts

4. **Core Implementation**
   - Jellyfin service (API integration)
   - NFO service (atomic file writes)
   - Videos controller (REST endpoints)
   - Frontend components (list + form + toast)

### AI Agent Guidelines

- Follow all naming conventions (kebab-case files, PascalCase components)
- Use the exact project structure defined above
- Implement save confirmation with clear visual feedback
- Use atomic file writes for NFO (temp → rename)
- Keep it simple - no over-engineering
