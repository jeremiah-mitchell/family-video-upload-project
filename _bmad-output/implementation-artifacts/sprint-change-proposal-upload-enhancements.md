# Sprint Change Proposal - Upload Enhancements

**Date:** 2026-01-06
**Author:** Correct-Course Workflow
**Status:** Approved
**Scope:** Minor (Direct implementation)

---

## Section 1: Issue Summary

### Problem Statement

After successful deployment of Epic 8 Video Upload feature, two refinements have been identified:

1. **Unique File Naming:** Uploaded files need a unique naming scheme to prevent confusion when uploading multiple videos with similar names
2. **Targeted Library Refresh:** Uploads should trigger a targeted Jellyfin library scan (Home Videos only) rather than a full library refresh

### Context

- **Trigger:** Post-deployment user feedback
- **Category:** Epic 8 enhancement (polish)
- **Discovery:** User tested upload feature and identified these refinements

### Evidence Supporting This Change

1. Current single video upload only adds timestamp suffix on collision (reactive)
2. Full library refresh (`POST /Library/Refresh`) scans all libraries unnecessarily
3. Jellyfin supports targeted library scanning via `POST /Items/{libraryId}/Refresh`

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Status | Impact |
|------|--------|--------|
| Epic 1-7 | Done/Backlog | No impact |
| Epic 8 | Done | Minor enhancement to Stories 8.1, 8.5 |

### Story Impact

**Affected Stories:**
- Story 8.1 (Video Upload API Endpoint) - Minor code change
- Story 8.5 (DVD VIDEO_TS Extraction) - Minor code change (uses same refresh)

### Technical Impact

**Backend Changes:**
1. `upload.service.ts`: Always generate unique filename with ISO date prefix
2. `jellyfin.service.ts`: Add targeted library refresh method
3. Replace `refreshLibrary()` calls with targeted method

**No Breaking Changes:**
- All existing functionality remains unchanged
- This is purely additive/improvement

---

## Section 3: Recommended Approach

### Selected Path: Direct Adjustment (Minor)

These are small code changes that can be implemented directly.

### Rationale

1. **Low Risk:** Simple changes to existing, working code
2. **Isolated:** Changes are contained within upload service
3. **Clear Implementation:** Well-understood Jellyfin API endpoints

### Effort Estimate

| Component | Effort |
|-----------|--------|
| Unique naming implementation | 15 minutes |
| Targeted library refresh | 15 minutes |
| Testing & deployment | 15 minutes |
| **Total** | **~45 minutes** |

---

## Section 4: Detailed Change Proposals

### Change 1: Unique File Naming Scheme

**File:** `apps/api/src/upload/upload.service.ts`

**Current Logic (lines 69-82):**
```typescript
// Sanitize filename - keep original but remove path components
const sanitizedName = this.sanitizeFilename(file.originalname);
const targetPath = join(this.mediaPath, sanitizedName);

// Check if file already exists
if (existsSync(targetPath)) {
  // Add timestamp to make unique
  const ext = extname(sanitizedName);
  const base = basename(sanitizedName, ext);
  const timestamp = Date.now();
  const uniqueName = `${base}_${timestamp}${ext}`;
  return this.saveFile(file, join(this.mediaPath, uniqueName), uniqueName);
}
```

**Proposed Logic:**
```typescript
// Sanitize and generate unique filename
// Format: YYYY-MM-DD_{shortHash}_{originalName}.ext
const sanitizedName = this.sanitizeFilename(file.originalname);
const ext = extname(sanitizedName);
const base = basename(sanitizedName, ext);
const datePrefix = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const shortHash = Math.random().toString(36).slice(2, 8); // 6-char random
const uniqueName = `${datePrefix}_${shortHash}_${base}${ext}`;
const targetPath = join(this.mediaPath, uniqueName);
```

**Rationale:**
- Date prefix groups uploads by day for easy organization
- Short hash ensures uniqueness without collision checking
- Original filename preserved for context
- Example: `2026-01-06_a3b2c1_Vacation_Video.mp4`

### Change 2: Targeted Library Refresh

**File:** `apps/api/src/jellyfin/jellyfin.service.ts`

**Add new method:**
```typescript
/**
 * Refresh only the Home Videos library
 * Much faster than full library refresh for post-upload discovery
 */
async refreshHomeVideosLibrary(): Promise<void> {
  const libraryId = await this.getHomeVideosLibraryId();

  if (!libraryId) {
    // Fall back to full refresh if library not found
    this.logger.warn('Home Videos library not found, falling back to full refresh');
    return this.refreshLibrary();
  }

  const url = `${this.baseUrl}/Items/${libraryId}/Refresh`;
  this.logger.debug(`Triggering Home Videos library refresh (${libraryId})`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      signal: this.createTimeoutSignal(),
    });

    if (!response.ok) {
      this.logger.warn(`Library refresh returned ${response.status}`);
    } else {
      this.logger.log('Home Videos library refresh triggered');
    }
  } catch (error) {
    this.logger.warn('Failed to trigger library refresh', error);
  }
}
```

**File:** `apps/api/src/upload/upload.service.ts`

**Replace all calls to:**
```typescript
this.jellyfinService.refreshLibrary()
```

**With:**
```typescript
this.jellyfinService.refreshHomeVideosLibrary()
```

**Affected locations:**
- Line 145 (conflict resolution path)
- Line 161 (normal upload path)
- Line 376 (DVD extraction completion)

---

## Section 5: Implementation Handoff

### Change Scope Classification

**Scope: Minor**

Direct implementation by development team. No backlog reorganization or architectural review needed.

### Implementation Sequence

1. Add `refreshHomeVideosLibrary()` method to `jellyfin.service.ts`
2. Update `uploadVideo()` to use unique naming scheme
3. Update all `refreshLibrary()` calls to use `refreshHomeVideosLibrary()`
4. Rebuild Docker images
5. Deploy to NAS

### Success Criteria

1. Uploaded files always have unique names (date + hash prefix)
2. Library refresh only scans Home Videos library (not all libraries)
3. New videos appear in Jellyfin after upload

---

## Approval

**Approved:** Yes - Minor scope, implementing directly.
