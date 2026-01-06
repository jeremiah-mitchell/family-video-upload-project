# Sprint Change Proposal: Configurable Jellyfin Library Name

**Date:** 2026-01-06
**Status:** Implemented
**Change Scope:** Minor (Direct dev implementation)

---

## Section 1: Issue Summary

### Problem Statement
The Family Video Tagger application was hardcoded to use "Home Videos" as the Jellyfin library name. The user's actual library containing family videos is named "Santiago y Armida Producciones", causing the app to display videos from the wrong library.

### When/How Discovered
Discovered during post-deployment testing on the NAS (10.0.0.4). The app was loading but showing incorrect videos and not loading existing metadata from NFO files.

### Evidence
- App displayed videos from "Home Videos" library instead of "Santiago y Armida Producciones"
- Metadata (people tags, descriptions) were not being highlighted as existing
- API was connecting to Jellyfin successfully but querying wrong library

---

## Section 2: Impact Analysis

### Epic Impact
- **Epic 6**: Story 6-1 (Filter Home Videos Library) required revision
- Impact: Low - existing implementation worked, just needed configuration flexibility

### Story Impact
- **Story 6-1**: Filter Home Videos Library
  - Originally hardcoded to "Home Videos"
  - Now uses configurable environment variable

### Artifact Conflicts
- No PRD changes required
- Architecture unchanged (environment variable pattern already established)
- No UI/UX changes

### Technical Impact
- **Code Changes**: 3 files modified
- **Infrastructure**: Docker compose updated with new env var
- **Deployment**: Required image rebuild and redeploy

---

## Section 3: Recommended Approach

### Chosen Path: Direct Adjustment
Modify the existing implementation to make the library name configurable via environment variable, following the established pattern for other configuration values.

### Rationale
- Follows existing configuration patterns in the codebase
- Minimal code changes required
- No architectural changes needed
- Backwards compatible (defaults to "Home Videos" if not specified)

### Effort & Risk
- **Effort**: ~30 minutes
- **Risk**: Very Low - simple configuration change
- **Timeline Impact**: None - completed within same session

---

## Section 4: Detailed Change Proposals

### 4.1 Environment Validation Schema

**File:** `apps/api/src/config/env.validation.ts`
**Section:** envSchema definition

**OLD:**
```typescript
// (no JELLYFIN_LIBRARY_NAME definition)
```

**NEW:**
```typescript
JELLYFIN_LIBRARY_NAME: z
  .string()
  .default('Home Videos')
  .describe('Jellyfin library name to use for video listing'),
```

**Rationale:** Add validated environment variable with sensible default

---

### 4.2 Configuration Service

**File:** `apps/api/src/config/app-config.service.ts`
**Section:** Class methods

**OLD:**
```typescript
// (no jellyfinLibraryName getter)
```

**NEW:**
```typescript
/**
 * Jellyfin library name to use for video listing
 */
get jellyfinLibraryName(): string {
  return this.configService.get('JELLYFIN_LIBRARY_NAME', { infer: true });
}
```

**Rationale:** Expose typed configuration value through service

---

### 4.3 Jellyfin Service

**File:** `apps/api/src/jellyfin/jellyfin.service.ts`
**Section:** Class definition and methods

**OLD:**
```typescript
const HOME_VIDEOS_LIBRARY_NAME = 'Home Videos';
// ... used as: HOME_VIDEOS_LIBRARY_NAME
```

**NEW:**
```typescript
private readonly libraryName: string;

constructor(/*...*/) {
  this.libraryName = this.configService.jellyfinLibraryName;
}
// ... used as: this.libraryName
```

**Rationale:** Replace hardcoded constant with injectable configuration

---

### 4.4 Docker Compose (NAS Deployment)

**File:** `docker-compose.nas.yml`
**Section:** api service environment

**OLD:**
```yaml
environment:
  # ... other vars
```

**NEW:**
```yaml
environment:
  # ... other vars
  - JELLYFIN_LIBRARY_NAME=Santiago y Armida Producciones
```

**Rationale:** Configure correct library name for production deployment

---

## Section 5: Implementation Handoff

### Change Scope Classification: Minor
Direct implementation by development team - no backlog reorganization needed.

### Handoff Recipients
- **Development Team**: Implement and test changes
- **DevOps**: Rebuild Docker images and redeploy

### Deliverables
1. Modified source files (3 TypeScript files)
2. Updated docker-compose.nas.yml
3. Rebuilt API Docker image (ghcr.io/jeremiah-mitchell/family-video-tagger-api:latest)

### Success Criteria
- [x] Application displays videos from "Santiago y Armida Producciones" library
- [x] Existing metadata (NFO files) loads correctly for tagged videos
- [x] People/tags are highlighted when video is selected
- [x] Configuration defaults to "Home Videos" if env var not set (backwards compatible)

---

## Implementation Status

**Completed:** 2026-01-06

### Files Modified
1. `apps/api/src/config/env.validation.ts` - Added JELLYFIN_LIBRARY_NAME
2. `apps/api/src/config/app-config.service.ts` - Added getter
3. `apps/api/src/jellyfin/jellyfin.service.ts` - Use configurable library name
4. `docker-compose.nas.yml` - Added environment variable

### Docker Image
- Rebuilt and pushed: `ghcr.io/jeremiah-mitchell/family-video-tagger-api:latest`

### Deployment
- Requires NAS (10.0.0.4) to pull latest image and restart containers
