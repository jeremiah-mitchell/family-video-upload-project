# Story 1.1: Initialize Monorepo Structure

Status: done

## Story

As a **developer**,
I want **to set up the npm workspaces monorepo with Next.js, NestJS, and shared packages**,
So that **I have a consistent development environment for building the application**.

## Acceptance Criteria

1. **Given** an empty project directory
   **When** I run the initialization scripts
   **Then** a monorepo structure is created with `apps/web`, `apps/api`, and `packages/shared`

2. **Given** the monorepo structure exists
   **When** I check the root `package.json`
   **Then** npm workspaces are configured pointing to `apps/*` and `packages/*`

3. **Given** all packages exist
   **When** I check TypeScript configuration
   **Then** each package has its own `tsconfig.json` with proper extends/references

4. **Given** the complete monorepo
   **When** I run `npm install` from the root
   **Then** all dependencies for all packages are installed correctly

## Tasks / Subtasks

- [x] Task 1: Create root project structure (AC: #1, #2)
  - [x] Initialize root `package.json` with npm workspaces config
  - [x] Configure workspaces: `["apps/*", "packages/*"]`
  - [x] Create `.gitignore` (node_modules, .env, .next, dist, etc.)
  - [x] Create root `tsconfig.json` as base configuration

- [x] Task 2: Initialize Next.js frontend app (AC: #1, #3)
  - [x] Create `apps/web` directory structure
  - [x] Run `npx create-next-app@latest` with TypeScript and App Router
  - [x] Configure `apps/web/package.json` with name `@family-video/web`
  - [x] Set up `apps/web/tsconfig.json` extending root config
  - [x] Create initial App Router structure: `src/app/page.tsx`, `src/app/layout.tsx`
  - [x] Add `src/components/` directory (empty for now)
  - [x] Add `src/lib/` directory (empty for now)

- [x] Task 3: Initialize NestJS backend app (AC: #1, #3)
  - [x] Create `apps/api` directory structure
  - [x] Run `npx @nestjs/cli new` or manual setup
  - [x] Configure `apps/api/package.json` with name `@family-video/api`
  - [x] Set up `apps/api/tsconfig.json` extending root config
  - [x] Create initial NestJS structure: `src/main.ts`, `src/app.module.ts`
  - [x] Create placeholder module directories: `jellyfin/`, `nfo/`, `videos/`

- [x] Task 4: Create shared package (AC: #1, #3)
  - [x] Create `packages/shared` directory structure
  - [x] Configure `packages/shared/package.json` with name `@family-video/shared`
  - [x] Set up `packages/shared/tsconfig.json`
  - [x] Create `src/index.ts` as package entry point
  - [x] Create `src/types/` directory with placeholder files
  - [x] Create `src/schemas/` directory for Zod schemas (empty for now)

- [x] Task 5: Verify workspace installation (AC: #4)
  - [x] Run `npm install` from root
  - [x] Verify all dependencies installed without errors
  - [x] Verify cross-package references work (web can import from shared)
  - [x] Run basic smoke tests: `npm run dev` in web, `npm run start:dev` in api

## Dev Notes

### Architecture Compliance

This story establishes the foundational project structure that ALL subsequent stories must follow. The architecture document specifies:

- **Monorepo Tool:** npm workspaces (NOT pnpm, yarn workspaces, or turborepo)
- **Frontend:** Next.js with App Router (NOT Pages Router)
- **Backend:** NestJS (NOT Express directly)
- **Shared Package:** For types and Zod schemas shared between frontend/backend

### Critical Constraints

1. **Package Naming Convention:** Use `@family-video/` prefix for all packages
   - `@family-video/web`
   - `@family-video/api`
   - `@family-video/shared`

2. **TypeScript Configuration:**
   - Root `tsconfig.json` provides base settings
   - Each package extends root with `"extends": "../../tsconfig.json"`

3. **Directory Structure Must Match Architecture:**
   ```
   /
   ├── apps/
   │   ├── web/src/
   │   │   ├── app/          # App Router pages
   │   │   ├── components/   # React components
   │   │   └── lib/          # Utility functions
   │   └── api/src/
   │       ├── main.ts
   │       ├── app.module.ts
   │       ├── jellyfin/     # Jellyfin integration module
   │       ├── nfo/          # NFO file writing module
   │       └── videos/       # Video endpoints module
   └── packages/
       └── shared/src/
           ├── index.ts      # Package exports
           ├── types/        # TypeScript interfaces
           └── schemas/      # Zod validation schemas
   ```

### Naming Conventions (Architecture-Mandated)

| Item | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `video-list.tsx`, `jellyfin.service.ts` |
| Components | PascalCase | `VideoList`, `TaggingForm` |
| Functions/Variables | camelCase | `getVideos`, `videoId` |
| Types/Interfaces | PascalCase | `Video`, `VideoMetadata` |
| CSS Modules | camelCase classes | `styles.videoCard` |

### Technology Versions

Use latest stable versions:
- **Next.js:** 14.x or 15.x (App Router)
- **NestJS:** 10.x
- **TypeScript:** 5.x
- **Node.js:** 20.x LTS

### DO NOT

- ❌ Do NOT use Tailwind CSS (architecture specifies CSS Modules)
- ❌ Do NOT use styled-components or emotion
- ❌ Do NOT add Redux, Zustand, or other state management (useState + fetch only)
- ❌ Do NOT add authentication libraries (Cloudflare Access handles auth)
- ❌ Do NOT create database schemas (no database - NFO files are persistence)
- ❌ Do NOT add testing frameworks yet (defer to later stories)

### Project Structure Notes

This is story 1.1 - the first story in a greenfield project. There is no existing codebase to integrate with.

**Critical:** The structure established here becomes the foundation for all subsequent stories. Follow the architecture exactly.

### References

- [Source: planning-artifacts/architecture.md#Technology Stack]
- [Source: planning-artifacts/architecture.md#Project Structure]
- [Source: planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: planning-artifacts/epics.md#Story 1.1: Initialize Monorepo Structure]
- [Source: planning-artifacts/prd.md#FR23-FR26 Administration & Configuration]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- ✅ Created npm workspaces monorepo structure with apps/ and packages/ directories
- ✅ Configured root package.json with workspaces pointing to apps/* and packages/*
- ✅ Updated .gitignore for Node.js/TypeScript project (replaced Python config)
- ✅ Created root tsconfig.json with strict TypeScript settings
- ✅ Initialized Next.js 14.x frontend app at apps/web with App Router
- ✅ Initialized NestJS 10.x backend app at apps/api with placeholder modules
- ✅ Created shared package at packages/shared with Video and VideoMetadata types
- ✅ Verified npm install completes successfully (381 packages installed)
- ✅ Verified cross-package references work (@family-video/shared symlinked correctly)
- ✅ Verified Next.js dev server starts and compiles successfully
- ✅ Verified NestJS dev server starts and runs successfully

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-02 | Story created with comprehensive context | SM Agent |
| 2026-01-02 | Implemented all tasks - monorepo structure complete | Dev Agent |
| 2026-01-02 | Code review completed - 6 issues found, 4 fixed | Reviewer Agent |

### File List

**Created:**
- package.json (root workspace config)
- tsconfig.json (root TypeScript config)
- .gitignore (updated for Node.js)
- apps/web/package.json
- apps/web/tsconfig.json
- apps/web/next.config.js
- apps/web/next-env.d.ts
- apps/web/src/app/layout.tsx
- apps/web/src/app/page.tsx
- apps/web/src/app/globals.css
- apps/web/src/components/.gitkeep
- apps/web/src/lib/api.ts (stub with placeholders)
- apps/api/package.json
- apps/api/tsconfig.json
- apps/api/nest-cli.json
- apps/api/src/main.ts
- apps/api/src/app.module.ts
- apps/api/src/jellyfin/.gitkeep
- apps/api/src/nfo/.gitkeep
- apps/api/src/videos/.gitkeep
- packages/shared/package.json
- packages/shared/tsconfig.json
- packages/shared/src/index.ts
- packages/shared/src/types/video.ts
- packages/shared/src/types/metadata.ts
- packages/shared/src/schemas/metadata.schema.ts
- README.md (updated for actual tech stack)

## Code Review Record

### Review Date
2026-01-02

### Reviewer
Claude Opus 4.5 (Adversarial Code Review Agent)

### Issues Found: 6

| # | Severity | Category | Location | Issue | Resolution |
|---|----------|----------|----------|-------|------------|
| 1 | HIGH | Architecture | apps/web/tsconfig.json | ES2017 target instead of ES2022 | ✅ Fixed |
| 2 | MEDIUM | Missing File | packages/shared/src/schemas/ | No Zod schema file created | ✅ Fixed - created metadata.schema.ts |
| 3 | MEDIUM | Configuration | packages/shared/package.json | Non-standard main/types pointing to src | ⚠️ Accepted - works for internal packages |
| 4 | MEDIUM | Missing File | apps/web/src/lib/ | Empty lib dir - should have api.ts stub | ✅ Fixed - created api.ts |
| 5 | LOW | Code Style | apps/api/src/main.ts | Using console.log instead of NestJS Logger | ⚠️ Accepted - architecture allows console.log |
| 6 | LOW | Documentation | Root | Outdated README.md | ✅ Fixed - updated for actual tech stack |

### Verification
- ✅ Shared package builds successfully
- ✅ Next.js builds successfully with updated tsconfig
- ✅ All acceptance criteria verified
