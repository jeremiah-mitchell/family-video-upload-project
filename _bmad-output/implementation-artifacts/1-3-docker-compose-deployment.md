# Story 1.3: Docker Compose Deployment

Status: complete

## Story

As a **developer**,
I want **to deploy the application as Docker containers using Docker Compose**,
So that **I can run the webapp on my Proxmox VM**.

## Acceptance Criteria

1. **Given** the monorepo with web and api apps
   **When** I run `docker-compose up`
   **Then** both containers start successfully

2. **Given** Docker containers are running
   **When** I check the ports
   **Then** the web container serves the frontend on port 3000
   **And** the api container serves the backend on port 3001

3. **Given** Docker Compose is configured
   **When** I check the environment variables
   **Then** environment variables are passed to containers correctly

4. **Given** the api container is running
   **When** I check volume mounts
   **Then** the media directory is mounted as a volume in the api container

## Tasks / Subtasks

- [x] Task 1: Create Dockerfile for NestJS API (AC: #1, #2)
  - [x] Create `apps/api/Dockerfile` with multi-stage build
  - [x] Use Node 20 Alpine base image
  - [x] Install production dependencies only in final stage
  - [x] Set working directory and copy built files
  - [x] Expose port 3001
  - [x] Set `CMD ["node", "dist/main.js"]`

- [x] Task 2: Create Dockerfile for Next.js frontend (AC: #1, #2)
  - [x] Create `apps/web/Dockerfile` with multi-stage build
  - [x] Use Node 20 Alpine base image
  - [x] Build Next.js in standalone output mode
  - [x] Copy standalone output to final stage
  - [x] Expose port 3000
  - [x] Set `CMD ["node", "server.js"]`

- [x] Task 3: Configure Next.js for standalone output (AC: #2)
  - [x] Update `apps/web/next.config.js` with `output: 'standalone'`
  - [x] Ensure static files are included in standalone build

- [x] Task 4: Create docker-compose.yml (AC: #1, #2, #3, #4)
  - [x] Create `docker-compose.yml` at project root
  - [x] Define `web` service building from `apps/web/Dockerfile`
  - [x] Define `api` service building from `apps/api/Dockerfile`
  - [x] Configure port mappings (3000:3000, 3001:3001)
  - [x] Pass environment variables to api container
  - [x] Mount media directory as volume to api container
  - [x] Set `depends_on` for web → api dependency

- [x] Task 5: Create .dockerignore files (AC: #1)
  - [x] Create root `.dockerignore` with node_modules, .git, etc.
  - [x] App-specific .dockerignore not needed (root covers all)
  - [x] App-specific .dockerignore not needed (root covers all)

- [x] Task 6: Verify Docker build and run (AC: #1, #2, #3, #4)
  - [x] Run `docker-compose build` and verify no errors
  - [x] Run `docker-compose up` and verify both containers start
  - [x] Verify web accessible on http://localhost:3000
  - [x] Verify api accessible on http://localhost:3001
  - [x] Verify environment variables are loaded in api container

## Dev Notes

### Architecture Compliance

This story implements **FR26** from the PRD:
- FR26: Jeremiah can deploy the application as a Docker container

From Architecture document:
- Docker Compose on Proxmox (already established infrastructure)
- Separate Dockerfiles for web and api
- Environment variables passed via docker-compose.yml
- Media directory mounted as volume for NFO file writing

### Deployment Architecture (from Architecture doc)

```
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

### Previous Story Learnings (Story 1.2)

From the code review and implementation:
- Environment variables are validated via Zod at startup
- `.env` file is read from project root (`../../.env` from apps/api)
- AppConfigService provides typed access to JELLYFIN_URL, JELLYFIN_API_KEY, MEDIA_PATH, PORT, CORS_ORIGIN
- API starts on port 3001 (configurable via PORT env var)
- CORS origin is configurable via CORS_ORIGIN env var

Files that will be used by Docker:
- `apps/api/src/config/*` - Config module that reads env vars
- `apps/api/src/main.ts` - Entry point that logs config at startup

### Environment Variables for docker-compose.yml

From `.env.example` and architecture:

```yaml
api:
  JELLYFIN_URL: "http://jellyfin:8096"  # Docker network name
  JELLYFIN_API_KEY: "${JELLYFIN_API_KEY}"  # From .env file
  MEDIA_PATH: "/media"  # Container path (mounted volume)
  PORT: "3001"
  CORS_ORIGIN: "http://localhost:3000"  # Or production URL

web:
  NEXT_PUBLIC_API_URL: "http://api:3001"  # Docker network
```

### Docker Build Patterns

**Multi-stage build for smaller images:**
1. Stage 1 (builder): Install all deps, build TypeScript
2. Stage 2 (production): Copy only dist + production deps

**Next.js standalone mode:**
- Set `output: 'standalone'` in next.config.ts
- Creates self-contained server.js with minimal deps
- Copy `.next/standalone` + `.next/static` + `public` to final image

**NestJS build:**
- `npm run build` creates `dist/` folder
- Copy `dist/` + `node_modules/` (production only) to final image

### Volume Mount Pattern

```yaml
volumes:
  - ${MEDIA_PATH:-/mnt/media}:/media:rw
```

- Host path from env var or default
- Container path is `/media` (matches MEDIA_PATH env var in container)
- Read-write access for NFO file writing

### Naming Conventions (from Story 1.1)

- Files: kebab-case (`docker-compose.yml`, not `docker-compose.yaml`)
- Services: lowercase (`web`, `api`)
- Environment variables: SCREAMING_SNAKE_CASE

### Critical Constraints

1. **Node version:** Use Node 20 Alpine for smaller images
2. **npm workspaces:** Need to handle monorepo structure in Docker build
3. **Shared package:** Must be available during build for both apps
4. **Port consistency:** 3000 for web, 3001 for api (matches .env.example)
5. **Volume permissions:** Ensure container can write to mounted media directory

### DO NOT

- Do NOT use `latest` tag for base images (pin to specific version)
- Do NOT include node_modules in Docker image (rebuild in container)
- Do NOT hardcode paths (use environment variables)
- Do NOT include .env file in Docker image (pass via docker-compose)
- Do NOT expose unnecessary ports

### References

- [Source: planning-artifacts/architecture.md#Deployment Architecture]
- [Source: planning-artifacts/architecture.md#Environment Configuration]
- [Source: planning-artifacts/prd.md#FR26 Docker deployment]
- [Source: implementation-artifacts/1-2-configure-environment-variables.md#File List]
- [Source: .env.example - Environment variable documentation]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **Multi-stage Docker builds** - Both Dockerfiles use multi-stage builds to minimize final image size. Builder stage installs all deps and compiles, production stage only has runtime deps.

2. **Monorepo workspace handling** - Dockerfiles copy all workspace package.json files first, run `npm ci`, then build shared package before the app package. This ensures workspace dependencies resolve correctly.

3. **Next.js standalone mode** - Added `output: 'standalone'` to next.config.js. The standalone build creates a self-contained server.js with minimal dependencies.

4. **Public directory fix** - Created `apps/web/public/.gitkeep` because the Docker build copies the public directory but it didn't exist. This prevents build failures.

5. **Docker Compose v2** - Removed deprecated `version: '3.8'` attribute as Docker Compose v2 no longer requires it.

6. **Security in web container** - Web Dockerfile creates non-root user (nextjs:nodejs) and runs the container as that user for improved security.

7. **Environment variable patterns** - API container uses `${VAR:-default}` syntax for optional env vars with defaults. JELLYFIN_API_KEY has no default (required).

8. **Volume mount** - Media directory mounted with `:rw` for read-write access to enable NFO file writing.

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-03 | Story created with comprehensive context | SM Agent |
| 2026-01-03 | Story implemented - all tasks complete | Dev Agent |
| 2026-01-03 | Code review fixes: NODE_ENV, non-root user, healthcheck, API URL | Code Review |

### File List

| File | Action | Description |
|------|--------|-------------|
| `apps/api/Dockerfile` | Created | Multi-stage Dockerfile for NestJS API with npm workspaces support |
| `apps/api/src/health/health.controller.ts` | Created | Health endpoint for Docker healthcheck |
| `apps/api/src/health/health.module.ts` | Created | Health module registration |
| `apps/api/src/health/index.ts` | Created | Health module barrel export |
| `apps/api/src/app.module.ts` | Modified | Added HealthModule import |
| `apps/web/Dockerfile` | Created | Multi-stage Dockerfile for Next.js with standalone output mode |
| `apps/web/next.config.js` | Modified | Added `output: 'standalone'` for Docker deployment |
| `apps/web/public/.gitkeep` | Created | Placeholder to ensure public directory exists for Docker build |
| `docker-compose.yml` | Created | Docker Compose orchestration for web and api services with healthcheck |
| `.dockerignore` | Created | Excludes node_modules, build outputs, .git, env files from Docker context |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Modified | Updated story status to done |

## Production Deployment Strategy

### Image Registry

Production images are hosted on GitHub Container Registry (GHCR):
- `ghcr.io/jeremiah-mitchell/family-video-tagger-api:latest`
- `ghcr.io/jeremiah-mitchell/family-video-tagger-web:latest`

### Building and Pushing Images

From the project root on a development machine:

```bash
# Ensure logged into GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u jeremiah-mitchell --password-stdin

# Build and push API image
docker build -f apps/api/Dockerfile -t ghcr.io/jeremiah-mitchell/family-video-tagger-api:latest .
docker push ghcr.io/jeremiah-mitchell/family-video-tagger-api:latest

# Build and push Web image
docker build -f apps/web/Dockerfile -t ghcr.io/jeremiah-mitchell/family-video-tagger-web:latest .
docker push ghcr.io/jeremiah-mitchell/family-video-tagger-web:latest
```

### NAS Deployment (Portainer)

The production deployment runs on UGREEN NAS via Portainer with pre-built images from GHCR.

**Portainer Stack Configuration:**
```yaml
services:
  api:
    image: ghcr.io/jeremiah-mitchell/family-video-tagger-api:latest
    user: "0:0"  # Run as root for volume access
    container_name: family-video-tagger-api
    ports:
      - "3001:3001"
    environment:
      - JELLYFIN_URL=http://10.0.0.4:8096
      - JELLYFIN_API_KEY=${JELLYFIN_API_KEY}
      - JELLYFIN_USER=jeremiah
      - MEDIA_PATH=/home-videos
      - PORT=3001
      - CORS_ORIGIN=http://10.0.0.4:3000
    volumes:
      - /volume3/vault/home-videos:/home-videos:rw
    restart: unless-stopped

  web:
    image: ghcr.io/jeremiah-mitchell/family-video-tagger-web:latest
    container_name: family-video-tagger-web
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://api:3001
      - NEXT_PUBLIC_API_URL=http://10.0.0.4:3001
    restart: unless-stopped
```

### Deployment Workflow

1. Make code changes and commit to `main`
2. Build and push new images from dev machine (see commands above)
3. In Portainer: Go to Stacks → family-video-tagger
4. Click "Pull and redeploy" or manually recreate containers
5. Verify containers are running and healthy

### Troubleshooting

**API container not starting:**
- Check Portainer logs for the api container
- Verify JELLYFIN_API_KEY environment variable is set
- Verify volume mount path exists: `/volume3/vault/home-videos`
- Check Jellyfin is accessible at configured URL

**Web container showing connection errors:**
- Ensure API container is running first
- Verify NEXT_PUBLIC_API_URL points to correct IP:port
- Check CORS_ORIGIN in API matches web URL
