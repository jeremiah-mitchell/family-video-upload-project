# Sprint Change Proposal: Enhanced Metadata Features

**Date:** 2026-01-05
**Author:** Jeremiah
**Status:** Pending Approval

---

## 1. Issue Summary

### Problem Statement

The MVP successfully enables metadata tagging, but real-world usage has revealed three enhancements needed for better usability and Jellyfin integration:

1. **People Name Mapping**: Display short/familiar names in UI (e.g., "Santiago") but store full names in NFO metadata (e.g., "Santiago Arcaraz") for proper display in Jellyfin's actor listings.

2. **Date Pre-population**: Pre-fill the Date field from Jellyfin's `DateCreated` timestamp when selecting untagged videos, reducing manual entry. The date saves to the NFO `<premiered>` tag for Jellyfin year display.

3. **Tags Feature**: Add categorical tags (Christmas, Mexico, Family, etc.) to enable video organization beyond the existing people/date/rating fields.

### Context

- All 6 MVP epics are complete and the app is in active use
- These are usability enhancements, not bug fixes
- Date pre-population is already partially implemented in the codebase
- User provided specific family member name mappings

### Evidence

**Family Member Mappings Provided:**
| UI Display | NFO Metadata |
|------------|--------------|
| Santiago | Santiago Arcaraz |
| Armida | Armida Arcaraz |
| Fernanda | Fernanda Arcaraz Mitchell |
| Mariana | Mariana Arcaraz |
| Tita | Tita |
| Jeremiah | Jeremiah Arcaraz Mitchell |
| Eric | Eric Peyton |
| Lucia | Lucia Arcaraz |
| Sofia | Sofia Arcaraz Mitchell |

**Suggested Tags:**
- Christmas
- Mexico
- Family
- (Additional tags TBD)

---

## 2. Impact Analysis

### Epic Impact

| Epic | Status | Impact |
|------|--------|--------|
| Epic 1: Project Foundation | Done | No impact |
| Epic 2: Video Discovery | Done | No impact |
| Epic 3: Video Tagging Workflow | Done | **Requires story updates** |
| Epic 4: Save & Persistence | Done | **Requires NFO format updates** |
| Epic 5: Error Handling | Done | No impact |
| Epic 6: Usability Enhancements | Done | No impact |
| Epic 7: Remote Access | Backlog | No impact |

### Story Impact

**Story 3.2: Metadata Entry Form**
- Add Tags multi-select field to form
- Update form layout wireframe

**Story 3.3: People Selection**
- No UI change (short names still displayed)
- Backend maps to full names on save

**Story 4.1: NFO File Generation**
- Add `<tag>` element output
- Map people display names → full names
- Ensure date saves to `<premiered>` tag

### Artifact Conflicts

**PRD Updates Needed:**
- FR10: Update to specify name display vs storage behavior
- New FR: Add Tags field selection capability
- Update metadata field count: 5 → 6 fields

**Architecture Updates Needed:**
- Add `tags?: string[]` to VideoMetadata interface
- Add FAMILY_MEMBERS name mapping constant
- Update NFO XML generation for `<tag>` elements
- Document date behavior (DateCreated → premiered)

**UX Design Updates Needed:**
- Add Tags selection to form wireframe
- Document Tags interaction pattern

### Technical Impact

| Component | Change |
|-----------|--------|
| `packages/shared/src/types/metadata.ts` | Add `tags?: string[]` field |
| `packages/shared/src/schemas/metadata.schema.ts` | Add tags to Zod schema |
| `apps/web/src/components/tagging-form.tsx` | Add Tags UI, name mapping constant |
| `apps/api/src/nfo/nfo.service.ts` | Add tag generation, name mapping on save |
| `apps/api/src/jellyfin/jellyfin.service.ts` | Already fetching DateCreated ✓ |
| `apps/api/src/videos/videos.service.ts` | Already extracting date ✓ |

---

## 3. Recommended Approach

### Selected Path: Direct Adjustment

Modify existing stories and add targeted new functionality without restructuring epics.

### Rationale

1. **Low Effort**: Changes are additive - no refactoring needed
2. **Low Risk**: No breaking changes to existing functionality
3. **Partial Implementation**: Date pre-population already done in code
4. **Pattern Consistency**: Tags follows same pattern as People field

### Effort Estimate

| Task | Effort |
|------|--------|
| Update PRD documentation | 15 min |
| Update Architecture documentation | 15 min |
| Update UX Design documentation | 10 min |
| Update shared types/schemas | 10 min |
| Implement Tags UI component | 30 min |
| Implement name mapping (save) | 20 min |
| Update NFO generation | 20 min |
| **Total** | ~2 hours |

### Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tags not compatible with Jellyfin | Low | Jellyfin NFO spec supports `<tag>` |
| Name mapping breaks existing NFOs | Low | Existing NFOs unaffected, new saves use mapping |
| Date format mismatch | Low | Already tested in current implementation |

---

## 4. Detailed Change Proposals

### Change 1: PRD Updates

**Document:** `_bmad-output/planning-artifacts/prd.md`

**Section: Metadata Entry (FR8-FR13)**

OLD:
```
- FR10: Santiago can select one or more people who appear in the video
```

NEW:
```
- FR10: Santiago can select one or more people who appear in the video
  - UI displays familiar short names (e.g., "Santiago")
  - NFO stores full names for Jellyfin display (e.g., "Santiago Arcaraz")
- FR10a: Santiago can select one or more tags to categorize the video
  - Predefined tags: Christmas, Mexico, Family, Birthday, Vacation, Holiday, School, Sports
```

**Section: Product Scope - MVP**

OLD:
```
| 5 metadata fields | Title, Date, People, Rating, Description |
```

NEW:
```
| 6 metadata fields | Title, Date, People, Tags, Rating, Description |
```

---

### Change 2: Architecture Updates

**Document:** `_bmad-output/planning-artifacts/architecture.md`

**Section: Data Architecture - Add after existing content:**

```markdown
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

### Jellyfin Metadata Update Strategy

Due to a [known Jellyfin bug](https://github.com/jellyfin/jellyfin/issues/13655) where NFO file changes are not picked up during metadata refresh (introduced in 10.9+), we use a dual-write strategy:

1. **NFO File Write** - Metadata is written to NFO files for backup/portability
2. **Direct API Update** - Metadata is pushed directly to Jellyfin via `POST /Items/{itemId}`

This ensures immediate metadata updates while maintaining NFO files for data portability.
```

---

### Change 3: UX Design Updates

**Document:** `_bmad-output/planning-artifacts/ux-design-specification.md`

**Section: Tagging Form (Right Panel) - Update table:**

OLD:
```
| Field | Input Type | Notes |
|-------|------------|-------|
| Title | Text input | Required |
| Date | Native date picker | `<input type="date">` |
| People | Multi-select | Checkboxes or tag-style picker |
| Rating | Number input or slider | 1-10 scale |
| Description | Textarea | Optional, 2-3 rows |
```

NEW:
```
| Field | Input Type | Notes |
|-------|------------|-------|
| Title | Text input | Required |
| Date | Native date picker | `<input type="date">`, pre-filled from video creation date |
| People | Multi-select | Tag-style picker with short display names |
| Tags | Multi-select | Tag-style picker: Christmas, Mexico, Family, Birthday, Vacation, Holiday, School, Sports |
| Rating | Number input or slider | 1-10 scale |
| Description | Textarea | Optional, 2-3 rows |
```

---

### Change 4: Epic 3 Story Updates

**Document:** `_bmad-output/planning-artifacts/epics.md`

**Story 3.2: Metadata Entry Form - Add to Acceptance Criteria:**

```markdown
**And** the Date field pre-populates from the video's creation date when available
**And** a Tags multi-select is displayed with predefined categories
**And** Tags options include: Christmas, Mexico, Family, Birthday, Vacation, Holiday, School, Sports
```

**Story 3.3: People Selection - Add to Acceptance Criteria:**

```markdown
**And** people display with short familiar names in the UI
**And** when saved, full names are stored in the NFO file for proper Jellyfin display
```

---

### Change 5: Code Implementation Tasks

**Task 1: Update Shared Types**
```typescript
// packages/shared/src/types/metadata.ts
export interface VideoMetadata {
  title: string;
  date?: string;
  people: string[];
  tags?: string[];  // NEW
  rating?: number;
  description?: string;
}
```

**Task 2: Add Name Mapping Constant**
```typescript
// apps/web/src/components/tagging-form.tsx
const FAMILY_MEMBERS: Record<string, string> = {
  'Santiago': 'Santiago Arcaraz',
  'Armida': 'Armida Arcaraz',
  'Fernanda': 'Fernanda Arcaraz Mitchell',
  'Mariana': 'Mariana Arcaraz',
  'Tita': 'Tita',
  'Jeremiah': 'Jeremiah Arcaraz Mitchell',
  'Eric': 'Eric Peyton',
  'Lucia': 'Lucia Arcaraz',
  'Sofia': 'Sofia Arcaraz Mitchell',
};

const FAMILY_MEMBER_NAMES = Object.keys(FAMILY_MEMBERS);
```

**Task 3: Add Tags Constant**
```typescript
const VIDEO_TAGS = [
  'Christmas',
  'Mexico',
  'Family',
  'Birthday',
  'Vacation',
  'Holiday',
  'School',
  'Sports',
];
```

**Task 4: Update NFO Generation**
```typescript
// apps/api/src/nfo/nfo.service.ts
// In generateNfoXml method:

// Map display names to full names for actors
const FAMILY_NAME_MAP: Record<string, string> = {
  'Santiago': 'Santiago Arcaraz',
  'Armida': 'Armida Arcaraz',
  // ... etc
};

// Add tags to NFO
if (metadata.tags && metadata.tags.length > 0) {
  for (const tag of metadata.tags) {
    lines.push(`  <tag>${this.escapeXml(tag)}</tag>`);
  }
}
```

---

## 5. Implementation Handoff

### Change Scope: Minor

This is a minor enhancement that can be implemented directly by the development team.

### Handoff Recipients

| Role | Responsibility |
|------|----------------|
| Developer (Jeremiah) | Implement all code changes |
| N/A | No PO/SM coordination needed |
| N/A | No architect escalation needed |

### Implementation Sequence

1. Update documentation (PRD, Architecture, UX, Epics)
2. Update shared types and Zod schema
3. Implement Tags UI in tagging-form.tsx
4. Implement name mapping in tagging-form.tsx (for display→full name on save)
5. Update NFO service for tags and name mapping
6. Test end-to-end
7. Deploy

### Success Criteria

- [ ] Tags appear in tagging form UI
- [ ] Tags save to NFO and appear in Jellyfin
- [ ] People names display short in UI, save as full names in NFO
- [ ] Date pre-fills from video creation date
- [ ] Existing tagged videos still work correctly
- [ ] Build passes with no errors

---

## Approval

**Status:** Awaiting user approval

**Decision Options:**
- **Approve**: Proceed with implementation
- **Revise**: Request changes to proposal
- **Reject**: Do not implement these changes

---

*Generated by BMAD Correct Course Workflow*
