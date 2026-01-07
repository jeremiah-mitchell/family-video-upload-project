# Sprint Change Proposal: UI/UX Improvements for Senior-Friendly Design

**Date:** 2026-01-06
**Change Trigger:** User feedback after initial deployment
**Scope Classification:** Minor (direct implementation by dev team)

---

## Section 1: Issue Summary

### Problem Statement
The current UI is functional but not optimized for the target user (Santiago - older, less tech-literate). Several usability issues have been identified:

1. **Now Playing section too small** - Most commonly clicked element, should be more prominent
2. **Add Video button lacks visual weight** - Should match the "Watch in Jellyfin" button styling
3. **Android-like styling** - Should be more Apple-like for familiarity
4. **Upload page layout issues** - Smaller than main page, back button unclear
5. **Overall accessibility** - Needs larger touch targets and clearer visual hierarchy for older users

### Code Issues
1. **Timezone bug** - Dates stored in UTC cause Jellyfin to show wrong day (1/1/2026 shows as 12/31/2025)
2. **Wrong default on upload page** - DVD is the most common upload type, should be default

### Context
- Discovered during production use with Santiago
- All Epics 1-8 are complete - this is a polish/refinement change
- UI changes should be on a separate branch for easy rollback

### Evidence
- User feedback: "The now playing section is hard to see"
- User feedback: "The add video option should look more like a button"
- User feedback: "It looks like Android, I want Apple-style"
- Date bug: Setting date 1/1/2026 in UI results in Jellyfin showing 12/31/2025

---

## Section 2: Impact Analysis

### Epic Impact
- **No existing epics affected** - All 8 epics remain complete
- **New Epic 9** required for UI/UX improvements

### Story Impact
- No changes to completed stories
- 4 new stories needed (defined below)

### Artifact Conflicts
| Artifact | Impact | Changes Needed |
|----------|--------|----------------|
| PRD | None | Target user (Santiago) already defined as non-technical |
| Architecture | None | No backend architectural changes |
| UX Spec | Minor | Update styling guidelines to reflect Apple-like design |

### Technical Impact

**UI Changes (Branch: `feature/ui-ux-improvements`):**
- `apps/web/src/app/globals.css` - Update color palette, add larger spacing variables
- `apps/web/src/components/now-playing.module.css` - Larger thumbnail, bigger text, more prominent styling
- `apps/web/src/app/page.module.css` - Add Video button styling, overall layout adjustments
- `apps/web/src/app/upload/page.module.css` - Full-width layout, clearer back button
- `apps/web/src/app/upload/page.tsx` - Default to DVD tab

**Code Fix (Can be on main):**
- `apps/api/src/jellyfin/jellyfin.service.ts` - Convert date to Eastern Time before sending to Jellyfin

---

## Section 3: Recommended Approach

**Selected Path:** Direct Adjustment (Option 1)

### Rationale
- Pure frontend styling changes + one API date fix
- No architectural changes required
- Low risk - separate branch allows easy rollback
- Addresses real user feedback

### Effort Estimate: Low
- 3-4 hours total implementation time

### Risk Level: Low
- UI changes isolated to CSS and component structure
- Date fix is a simple timezone conversion
- Separate branch ensures main remains stable

---

## Section 4: Detailed Change Proposals

### New Epic 9: UI/UX Improvements

#### Story 9.1: Enhance Now Playing Section
**Status:** Ready for development

**Acceptance Criteria:**
- [ ] Now Playing section is significantly larger (2x current size minimum)
- [ ] Thumbnail is larger (80x60px instead of 40x30px)
- [ ] Text is larger and bolder
- [ ] Section has clear visual prominence (maybe subtle background color)
- [ ] Still appears only when video is playing

**Code Changes:**
```css
/* now-playing.module.css - Make section more prominent */
.container {
  padding: var(--spacing-md);
  background-color: var(--color-highlight, #e3f2fd);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
}

.thumbnail {
  width: 80px;
  height: 60px;
}

.name {
  font-size: 1.125rem;
  font-weight: 600;
}
```

---

#### Story 9.2: Update Button Styling to Apple-Like Design
**Status:** Ready for development

**Acceptance Criteria:**
- [ ] Add Video button has filled background (like Watch in Jellyfin)
- [ ] All buttons use Apple-like rounded corners and shadows
- [ ] Primary color updated to be more iOS-like (softer blue)
- [ ] Larger touch targets (min 44px height for accessibility)
- [ ] Subtle shadows instead of hard borders

**Code Changes:**
```css
/* globals.css - Apple-like design system */
:root {
  --color-primary: #007AFF; /* iOS blue */
  --color-primary-dark: #0056D6;
  --color-background: #F2F2F7; /* iOS light gray */
  --radius-lg: 12px; /* Apple-style rounded corners */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* page.module.css - Button box around Add Video */
.addButton {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background-color: var(--color-primary);
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  min-height: 44px;
}
```

---

#### Story 9.3: Fix Upload Page Layout and Back Button
**Status:** Ready for development

**Acceptance Criteria:**
- [ ] Upload page uses full width (matching main page)
- [ ] Back button is clearly visible with arrow icon
- [ ] Back button styled as prominent link/button
- [ ] DVD Folder is the default selected tab (most common use case)
- [ ] Consistent spacing with main page

**Code Changes:**
```tsx
// upload/page.tsx - Default to DVD
const [uploadType, setUploadType] = useState<UploadType>('dvd'); // Changed from 'video'
```

```css
/* upload/page.module.css */
.container {
  max-width: 100%; /* Full width */
}

.backLink {
  font-size: 1.125rem;
  font-weight: 600;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-lg);
}

.backLink::before {
  content: "←  ";
}
```

---

#### Story 9.4: Fix Timezone Bug for Dates
**Status:** Ready for development

**Acceptance Criteria:**
- [ ] Dates entered as 1/1/2026 appear as 1/1/2026 in Jellyfin
- [ ] Dates are converted to Eastern Time before sending to Jellyfin API
- [ ] NFO files also use Eastern Time for consistency

**Root Cause Analysis:**
- UI sends date as `YYYY-MM-DD` (e.g., `2026-01-01`)
- Jellyfin API receives this and interprets as UTC midnight: `2026-01-01T00:00:00Z`
- For Eastern Time (UTC-5), UTC midnight is 7:00 PM the previous day
- Jellyfin displays based on server timezone, showing 12/31/2025

**Solution:**
Add timezone handling to ensure dates are sent as Eastern Time noon:

```typescript
// jellyfin.service.ts - updateItemMetadata
if (metadata.date) {
  // Convert YYYY-MM-DD to Eastern Time noon to avoid date shift
  // Setting to noon EST ensures the date is correct in any timezone
  const dateWithTime = `${metadata.date}T12:00:00-05:00`;
  updatePayload.PremiereDate = dateWithTime;
}
```

---

## Section 5: Implementation Handoff

### Scope: Minor
Direct implementation by development team.

### Branch Strategy
- **UI Changes:** Create branch `feature/ui-ux-improvements` from main
- **Date Fix:** Can be on main directly (low risk, isolated change)

### Handoff Recipients
| Role | Responsibility |
|------|----------------|
| Developer | All 4 stories implementation |
| User (Jeremiah) | Testing and feedback on NAS deployment |

### Success Criteria
1. Now Playing section is immediately noticeable when video is playing
2. Add Video button looks like a primary action button
3. Overall look feels more "Apple" than "Android"
4. Upload page is full-width with clear navigation
5. DVD is default upload option
6. Date 1/1/2026 in UI shows as 1/1/2026 in Jellyfin

### Build & Deploy Notes
After UI branch is complete:
```bash
# Merge UI branch
git checkout main
git merge feature/ui-ux-improvements

# Rebuild both tags
docker build --platform linux/amd64 -f apps/api/Dockerfile -t ghcr.io/jeremiah-mitchell/family-video-tagger-api:latest .
docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_API_URL=http://10.0.0.4:3001 -f apps/web/Dockerfile -t ghcr.io/jeremiah-mitchell/family-video-tagger-web:latest .

# Remote versions
docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_API_URL=https://api-syap.losbisquets.xyz -f apps/web/Dockerfile -t ghcr.io/jeremiah-mitchell/family-video-tagger-web:remote .
```

---

## Approval

**Status:** ✅ Approved (2026-01-06)

**Next Steps After Approval:**
1. Create branch `feature/ui-ux-improvements`
2. Implement Story 9.4 (date fix) on main first
3. Implement Stories 9.1-9.3 on feature branch
4. Test locally, then merge and deploy
