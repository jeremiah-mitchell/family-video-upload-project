# Story 1.2: Configure Environment Variables

Status: done

## Story

As a **developer**,
I want **to configure Jellyfin URL, API key, and media path via environment variables**,
So that **the application can connect to Jellyfin and write NFO files to the correct location**.

## Acceptance Criteria

1. **Given** the monorepo is initialized
   **When** I create a `.env` file with `JELLYFIN_URL`, `JELLYFIN_API_KEY`, and `MEDIA_PATH`
   **Then** the NestJS API can read these values at startup

2. **Given** environment variables are configured
   **When** I check the project documentation
   **Then** a `.env.example` file documents all required variables

3. **Given** a `.env` file exists
   **When** I check the git status
   **Then** the `.env` file is excluded from git via `.gitignore`

## Tasks / Subtasks

- [x] Task 1: Install NestJS configuration module (AC: #1)
  - [x] Install `@nestjs/config` package in apps/api
  - [x] Configure ConfigModule in `app.module.ts` with `isGlobal: true`

- [x] Task 2: Create environment variable schema (AC: #1)
  - [x] Create `apps/api/src/config/env.validation.ts` with Zod schema
  - [x] Define required variables: `JELLYFIN_URL`, `JELLYFIN_API_KEY`, `MEDIA_PATH`
  - [x] Define optional variables: `PORT` (default 3001), `CORS_ORIGIN` (default http://localhost:3000)
  - [x] Export typed configuration interface

- [x] Task 3: Create configuration service (AC: #1)
  - [x] Create `apps/api/src/config/config.module.ts`
  - [x] Create `apps/api/src/config/app-config.service.ts` for typed config access
  - [x] Export configuration values with proper typing
  - [x] Add validation on startup (fail fast if required vars missing)

- [x] Task 4: Create .env.example file (AC: #2)
  - [x] Create `.env.example` at project root with all variables documented
  - [x] Include comments explaining each variable's purpose
  - [x] Include example values (safe placeholders, not real credentials)

- [x] Task 5: Verify .gitignore excludes .env (AC: #3)
  - [x] Confirm `.env` is in .gitignore (already done in Story 1.1)
  - [x] Confirm `.env.local` and `.env.*.local` patterns are included
  - [x] Create a test `.env` file and verify it's not tracked

- [x] Task 6: Update main.ts to use configuration (AC: #1)
  - [x] Import ConfigService in main.ts
  - [x] Use ConfigService for PORT instead of process.env directly
  - [x] Use ConfigService for CORS_ORIGIN
  - [x] Add startup log showing configuration loaded successfully

## Dev Notes

### Architecture Compliance

This story implements **FR23, FR24, FR25** from the PRD:
- FR23: Jeremiah can configure Jellyfin server URL via environment variable
- FR24: Jeremiah can configure Jellyfin API key via environment variable
- FR25: Jeremiah can configure the media directory path via environment variable

From Architecture document:
- Environment variables are the sole configuration mechanism
- API key must NEVER be exposed to frontend (NFR6)
- Use ConfigModule from @nestjs/config (NestJS standard)

### Previous Story Learnings (Story 1.1)

From the code review:
- main.ts currently uses `process.env.PORT` and `process.env.CORS_ORIGIN` directly
- These should be migrated to use ConfigService for consistency
- The architecture allows console.log for logging (no need to add Logger)

Files created in Story 1.1 that we'll modify:
- `apps/api/src/main.ts` - Add ConfigService usage
- `apps/api/src/app.module.ts` - Add ConfigModule import

### Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JELLYFIN_URL` | Yes | Jellyfin server URL | `http://jellyfin:8096` |
| `JELLYFIN_API_KEY` | Yes | Jellyfin API key for authentication | `abc123...` |
| `MEDIA_PATH` | Yes | Path to media files (for NFO writing) | `/media/videos` |
| `PORT` | No | API server port | `3001` |
| `CORS_ORIGIN` | No | Frontend URL for CORS | `http://localhost:3000` |

### File Structure

```
apps/api/src/
├── config/
│   ├── config.module.ts          # ConfigModule setup
│   ├── app-config.service.ts     # Typed config access service
│   └── env.validation.ts         # Zod schema for env validation
├── main.ts                        # Updated to use ConfigService
└── app.module.ts                  # Import ConfigModule
```

### Naming Conventions (from Story 1.1)

- Files: kebab-case (`app-config.service.ts`, `env.validation.ts`)
- Classes: PascalCase (`AppConfigService`, `ConfigModule`)
- Variables: camelCase (`jellyfinUrl`, `apiKey`)

### Critical Constraints

1. **Security:** API key must be validated at startup, never logged, never exposed to frontend
2. **Fail Fast:** Application should fail to start if required env vars are missing
3. **Type Safety:** Use Zod for runtime validation + TypeScript for compile-time safety
4. **NestJS Patterns:** Follow standard NestJS ConfigModule patterns

### DO NOT

- ❌ Do NOT hardcode any configuration values
- ❌ Do NOT log the API key (even partially)
- ❌ Do NOT create .env file with real credentials (only .env.example)
- ❌ Do NOT expose configuration to frontend (backend only)

### References

- [Source: planning-artifacts/architecture.md#Environment Configuration]
- [Source: planning-artifacts/prd.md#FR23-FR25 Administration & Configuration]
- [Source: planning-artifacts/architecture.md#API Key Protection]
- [Source: implementation-artifacts/1-1-initialize-monorepo-structure.md#File List]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Configuration module implemented using @nestjs/config with Zod validation
- All environment variables validated at startup with clear error messages
- AppConfigService provides typed access to all configuration values
- Fail-fast behavior verified: app fails immediately with descriptive errors when required vars missing
- API key is never logged (security requirement met)
- Verified server starts successfully with valid .env configuration

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-03 | Story created with comprehensive context | SM Agent |
| 2026-01-03 | Implementation completed - all tasks done | Dev Agent |
| 2026-01-03 | Code review: Fixed 4 issues (zod dep, file list, agent model, commit) | Code Review |

### File List

| File | Action | Description |
|------|--------|-------------|
| apps/api/src/config/env.validation.ts | Created | Zod schema for environment variable validation |
| apps/api/src/config/app-config.service.ts | Created | Typed configuration service |
| apps/api/src/config/config.module.ts | Created | Global ConfigModule setup |
| apps/api/src/config/index.ts | Created | Module exports |
| apps/api/src/app.module.ts | Modified | Added AppConfigModule import |
| apps/api/src/main.ts | Modified | Updated to use AppConfigService |
| apps/api/package.json | Modified | Added @nestjs/config and zod dependencies |
| package-lock.json | Modified | Updated lockfile with new dependencies |
| .env.example | Created | Documentation for required environment variables |
