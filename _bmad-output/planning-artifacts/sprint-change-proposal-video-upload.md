# Sprint Change Proposal - Video Upload Feature

**Date:** 2026-01-06
**Author:** Correct-Course Workflow
**Status:** Implemented
**Updated:** 2026-01-06 - Fully implemented and deployed
**Implementation Notes:** Stories 8.1-8.5 complete. DVD folder upload uses browser webkitdirectory API. API includes ffmpeg and lsdvd in Docker image.

---

## Section 1: Issue Summary

### Problem Statement

The current family video tagger webapp has an upload page stub (Story 6.3) that displays "Coming Soon". Santiago needs the ability to upload new home video clips directly through the webapp, rather than requiring Jeremiah to manually add files to the NAS storage.

### Context

- **Trigger:** User-requested feature expansion
- **Category:** Post-MVP enhancement (V2+ feature per PRD)
- **Discovery:** All MVP epics (1-6) are complete. The upload stub was intentionally added in Epic 6 to prepare for this functionality.

### Evidence Supporting This Change

1. Story 6.3 already implements a placeholder at `/upload` route
2. "+ Add Video" button exists in the UI, navigating to the upload page
3. NAS storage is mounted as a volume in the API container with write access
4. User (Jeremiah) has explicitly requested this feature for the next sprint

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Status | Impact |
|------|--------|--------|
| Epic 1-5 | Done | No impact |
| Epic 6 | Done | Story 6.3 stub will be enhanced/replaced |
| Epic 7 (Remote Access) | Backlog | No conflict - upload works before/after remote access |
| **NEW: Epic 8 (Video Upload)** | Proposed | New epic to implement full upload functionality |

### Story Impact

**Current Stories:**
- Story 6.3 (Upload Page Stub) - Will be superseded by new Epic 8 stories

**New Stories Required:**

| Story | Description |
|-------|-------------|
| 8.1 | API endpoint for video file upload |
| 8.2 | Frontend upload UI (drag-drop or file picker) |
| 8.3 | Upload progress and feedback |
| 8.4 | Post-upload workflow (auto-navigate to tagging) |
| 8.5 | DVD VIDEO_TS upload and chapter extraction |
| 8.6 | (Future) Raw ISO unfinalized video support |

### Artifact Conflicts

| Artifact | Conflict | Action Needed |
|----------|----------|---------------|
| PRD | None - upload is V2+ feature | Document as post-MVP enhancement |
| Architecture | None - supports upload | Add new endpoint docs |
| UX Design | None - stub exists | Expand upload page wireframe |
| Docker Compose | None - volume mount ready | No changes |

### Technical Impact

**Backend Changes:**
- New endpoint: `POST /videos/upload`
- Multer integration for multipart file handling
- File validation (video MIME types, size limits)
- Atomic file writes to media directory
- Jellyfin library refresh trigger

**Frontend Changes:**
- Replace stub with functional upload UI
- File input or drag-and-drop zone
- Upload progress indicator
- Success/error toast notifications
- Optional: redirect to tagging form after upload

**No Breaking Changes:**
- All existing functionality remains unchanged
- This is purely additive

---

## Section 3: Recommended Approach

### Selected Path: Direct Adjustment (Option 1)

Add a new Epic 8 with targeted stories for video upload functionality.

### Rationale

1. **Clean Addition:** No existing work needs modification or rollback
2. **Groundwork Exists:** Upload stub, volume mounts, and "+ Add Video" button are ready
3. **Low Risk:** Standard file upload pattern - well-understood implementation
4. **Medium Effort:** 2-3 stories for core functionality, 1-2 for polish
5. **User Value:** Enables Santiago to add videos without technical assistance

### Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| API upload endpoint | Low | NestJS + Multer, ~2-3 hours |
| Frontend upload UI | Medium | File picker, progress, feedback, ~4-6 hours |
| Integration testing | Low | Upload + Jellyfin refresh, ~1-2 hours |
| **Total** | **1-2 days** | Including testing and deployment |

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Large file uploads timeout | Medium | Medium | Set appropriate timeouts, show progress |
| File validation bypass | Low | Medium | Server-side MIME type validation |
| Storage quota exceeded | Low | High | Check available space before write |
| Jellyfin doesn't detect new file | Low | Low | Force library refresh after upload |

---

## Section 4: Detailed Change Proposals

### Epic 8: Video Upload

**Epic Description:**
Santiago can upload new home video files directly through the webapp, making them available in the Jellyfin library for tagging.

**FRs covered:** None existing (new feature)

---

#### Story 8.1: Video Upload API Endpoint

**As a** developer,
**I want** the API to accept video file uploads,
**So that** Santiago can add new videos through the webapp.

**Acceptance Criteria:**

1. **Given** a video file in a supported format (mp4, mov, avi, mkv)
   **When** uploaded via `POST /videos/upload`
   **Then** the file is saved to the media directory

2. **Given** a file upload request
   **When** the file is saved successfully
   **Then** the API returns the new video ID and filename

3. **Given** an unsupported file type
   **When** uploaded via the API
   **Then** a 400 error is returned with a clear message

4. **Given** a successful file upload
   **When** the save completes
   **Then** a Jellyfin library refresh is triggered

**Technical Notes:**
- Use Multer for multipart handling
- Save files with original filename to `/home-videos/` directory
- Supported MIME types: video/mp4, video/quicktime, video/x-msvideo, video/x-matroska
- Size limit: 2GB (configurable via env var)
- Atomic write: upload to temp file, then move

---

#### Story 8.2: Upload UI Implementation

**As** Santiago,
**I want** to upload video files through the webapp,
**So that** I can add new videos without technical help.

**Acceptance Criteria:**

1. **Given** the upload page is open
   **When** I view the page
   **Then** I see a clear "Upload Video" interface

2. **Given** the upload interface
   **When** I click "Select File" or drag a file onto the zone
   **Then** the file is selected for upload

3. **Given** a file is selected
   **When** I click "Upload"
   **Then** the upload begins and progress is shown

4. **Given** an upload completes successfully
   **When** the server responds
   **Then** a success toast appears with the filename

**Technical Notes:**
- Replace existing stub at `/upload`
- Simple file input with optional drag-and-drop zone
- Show selected filename before upload
- Disable upload button during upload

---

#### Story 8.3: Upload Progress and Feedback

**As** Santiago,
**I want** to see upload progress,
**So that** I know the upload is working.

**Acceptance Criteria:**

1. **Given** a large file is uploading
   **When** I watch the progress
   **Then** I see a progress bar or percentage

2. **Given** an upload fails
   **When** the error occurs
   **Then** a clear error message is displayed

3. **Given** an upload succeeds
   **When** the process completes
   **Then** the video appears in the video list

**Technical Notes:**
- Use XMLHttpRequest or fetch with progress events
- Handle timeout errors gracefully
- Allow retry on failure

---

#### Story 8.4: Post-Upload Workflow (Optional Enhancement)

**As** Santiago,
**I want** to immediately tag a video after uploading it,
**So that** I can complete the workflow efficiently.

**Acceptance Criteria:**

1. **Given** an upload completed successfully
   **When** I click "Tag This Video"
   **Then** I am redirected to the main page with the new video selected

**Technical Notes:**
- Button in success state
- Passes video ID to main page for auto-selection
- Alternative: auto-redirect after 3 seconds with cancel option

---

### Architecture Updates

**Add to `architecture.md` under API Endpoints:**

```markdown
- `POST /videos/upload` - Upload a new video file (multipart/form-data)
  - Request: `file` field with video file
  - Response: `{ data: { id: string, filename: string }, message: string }`
  - Errors: 400 (invalid file), 413 (file too large), 500 (write failed)
```

**Add to `architecture.md` under Data Flow:**

```markdown
**Upload Flow:**
1. Frontend sends file via multipart POST
2. API validates file type and size
3. API writes file atomically (temp → rename)
4. API triggers Jellyfin library refresh
5. API returns success with new video info
6. Frontend shows confirmation and offers tagging
```

---

### UX Design Updates

**Update Upload Page Wireframe:**

```
┌─────────────────────────────────────────────────────────────┐
│  Family Video Tagger                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    📤 Upload Video                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │       Drag and drop a video file here               │   │
│  │              or click to select                     │   │
│  │                                                     │   │
│  │         Supported: MP4, MOV, AVI, MKV              │   │
│  │              Max size: 2 GB                        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Selected: [video_filename.mp4]                             │
│                                                             │
│  ┌────────────────────────────────────────┐                │
│  │████████████████░░░░░░░░░░░░│ 65%       │                │
│  └────────────────────────────────────────┘                │
│                                                             │
│                    [Cancel]  [Upload]                       │
│                                                             │
│                    [← Back to Tagging]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 4b: DVD VIDEO_TS Research Findings

### Research Summary

Investigation of sample DVD VIDEO_TS folders revealed additional complexity for the upload feature. Family home videos exist in two primary formats:

1. **Individual video files** (MP4, MOV, etc.) - Standard upload handling
2. **DVD VIDEO_TS folders** - Require extraction/conversion before upload

### Sample Analysis Results

**Test Data:** Two sides of a single family DVD (Disc 1)

| Side | Chapters | Total Duration | File Size | Output Size |
|------|----------|----------------|-----------|-------------|
| Side A | 14 | 28:42 | ~3.3 GB (2 VOB files) | ~356 MB |
| Side B | 11 | 19:54 | ~2.2 GB (2 VOB files) | ~230 MB |

**Key Discovery:** Each chapter represents a distinct home video clip that should become a separate uploadable file.

### DVD Structure Analysis

A typical VIDEO_TS folder contains:

```
VIDEO_TS/
├── VIDEO_TS.BUP     # Backup of VIDEO_TS.IFO
├── VIDEO_TS.IFO     # Navigation info
├── VTS_01_0.BUP     # Backup of VTS_01_0.IFO
├── VTS_01_0.IFO     # Title info with chapter markers
├── VTS_01_0.VOB     # Menu content (usually small)
├── VTS_01_1.VOB     # Video content part 1 (up to 1GB)
└── VTS_01_2.VOB     # Video content part 2 (continuation)
```

**Critical Insight:** Chapter timing information is stored in IFO files, not VOB files. The `lsdvd` tool parses IFO files to extract chapter boundaries.

### Extraction Pipeline

**Required Tools:**
- `lsdvd` - Parse DVD IFO files for chapter information
- `ffmpeg` - Extract and transcode video segments

**Proven Extraction Command:**
```bash
ffmpeg -y -analyzeduration 100M -probesize 100M \
  -i "concat:VTS_01_1.VOB|VTS_01_2.VOB" \
  -ss $start_time -t $duration \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 192k \
  -metadata title="Chapter XX" \
  output.mp4
```

**Key Technical Requirements:**
1. **VOB Concatenation:** Multiple VOB files must be combined using `concat:` protocol
2. **Analysis Buffers:** Large `-analyzeduration` and `-probesize` values (100M) required for proper stream detection
3. **Chapter Math:** Start times calculated by summing previous chapter durations
4. **Encoding:** H.264/AAC produces ~90% size reduction while maintaining quality

### Impact on Upload Feature

**Two Distinct Workflows:**

| Workflow | Input | Processing | Output |
|----------|-------|------------|--------|
| Simple Upload | Single video file | Validate, save | One video in library |
| DVD Extraction | VIDEO_TS folder | Parse chapters, extract each, save all | Multiple videos in library |

### Updated Story Requirements

**Story 8.5: DVD VIDEO_TS Upload Support**

**As** Jeremiah,
**I want** to upload a VIDEO_TS folder and extract individual chapters,
**So that** I can add DVDs full of home video clips to the library.

**Acceptance Criteria:**

1. **Given** a VIDEO_TS folder is uploaded (as ZIP or individual files)
   **When** the system detects IFO files
   **Then** it parses chapter information using lsdvd

2. **Given** chapter information is available
   **When** extraction begins
   **Then** each chapter is extracted to a separate MP4 file

3. **Given** extraction is in progress
   **When** viewing the upload page
   **Then** progress shows "Extracting chapter X of Y"

4. **Given** extraction completes
   **When** all chapters are processed
   **Then** all videos appear in the Jellyfin library

**Technical Notes:**
- Server-side requires: `lsdvd`, `ffmpeg`
- Frontend may need folder upload support (webkitdirectory) or ZIP upload
- Background job processing recommended for multi-chapter extraction
- Each extracted clip named: `{original_folder_name}_ch{XX}.mp4`

### Deferred Research

**Second Format (TBD):** Raw ISO extract of unfinalized video files
- Requires separate investigation
- May have different structure than finalized DVDs
- Consider as Story 8.6 after 8.5 is complete

### Risk Updates for DVD Support

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| lsdvd/ffmpeg not installed | Medium | High | Docker image with tools pre-installed |
| Very short chapters (< 3s) | Low | Low | Skip or warn on chapters under minimum duration |
| Multi-title DVDs | Low | Medium | Default to longest title, allow override |
| Corrupt IFO files | Low | Medium | Graceful error with "cannot parse DVD" message |
| Extraction timeout (large DVDs) | Medium | Medium | Background job queue with status polling |

### Revised Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| Story 8.1-8.4 (Simple Upload) | 1-2 days | Original estimate unchanged |
| Story 8.5 (DVD Extraction) | 2-3 days | Backend processing, progress tracking |
| **Total** | **3-5 days** | Including testing and deployment |

---

## Section 5: Implementation Handoff

### Change Scope Classification

**Scope: Minor**

This is a well-defined feature addition that can be implemented directly by the development team without requiring backlog reorganization or architectural review.

### Handoff Plan

| Role | Responsibility |
|------|----------------|
| Dev Agent | Implement Stories 8.1-8.4 |
| SM Agent (optional) | Create story files from this proposal |
| Code Review | Standard code review after implementation |

### Success Criteria

1. Santiago can upload a video file through the webapp
2. Uploaded video appears in the video list after refresh
3. Uploaded video can be tagged normally
4. Errors are handled gracefully with clear messages

### Implementation Sequence

**Phase 1: Simple Upload (Core)**
1. **Story 8.1:** API endpoint (backend first)
2. **Story 8.2:** Upload UI (connects to API)
3. **Story 8.3:** Progress and feedback (polish)
4. **Story 8.4:** Post-upload workflow (navigate to tagging)

**Phase 2: DVD Support**
5. **Story 8.5:** DVD VIDEO_TS extraction (server-side processing)

**Future (TBD)**
6. **Story 8.6:** Raw ISO unfinalized video support

### Dependencies

**Phase 1 (Simple Upload):**
- None - all prerequisite infrastructure is in place:
  - Volume mount with write access ✓
  - NestJS API with Express/Multer support ✓
  - Frontend routing to `/upload` ✓
  - Toast notifications for feedback ✓

**Phase 2 (DVD Support):**
- Docker image must include: `lsdvd`, `ffmpeg`
- Background job processing (consider Bull queue or similar)
- Sufficient temp storage for extraction process

---

## Approval Request

**Question:** Do you approve this Sprint Change Proposal for implementing the Video Upload feature as Epic 8?

- **[Yes]** - Proceed with implementation
- **[No]** - Revise proposal based on feedback
- **[Revise]** - Specific changes requested

---

## Appendix: Sprint Status Update (Post-Approval)

Upon approval, update `sprint-status.yaml` with:

```yaml
  # Epic 8: Video Upload
  epic-8: backlog
  8-1-video-upload-api-endpoint: backlog
  8-2-upload-ui-implementation: backlog
  8-3-upload-progress-and-feedback: backlog
  8-4-post-upload-workflow: backlog
  8-5-dvd-video-ts-extraction: backlog
  8-6-raw-iso-unfinalized-support: backlog  # Future - TBD
  epic-8-retrospective: optional
```
