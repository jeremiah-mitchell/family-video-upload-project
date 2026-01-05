# Story 2.3: Tagged/Untagged Filtering

Status: done

## Story

As **Santiago**,
I want **to filter the video list by tagged status**,
So that **I can focus on videos that still need tagging**.

## Acceptance Criteria

1. **Given** the video list is displayed
   **When** I select "Untagged" from the filter dropdown
   **Then** only untagged videos are shown

2. **Given** the video list is displayed
   **When** I select "Tagged" from the filter dropdown
   **Then** only tagged videos are shown

3. **Given** the video list is displayed
   **When** I select "All" from the filter dropdown
   **Then** all videos are shown

4. **Given** the page loads
   **When** displaying the filter dropdown
   **Then** the default filter is "Untagged"

## Tasks / Subtasks

- [x] Task 1: Create FilterDropdown component (AC: #1, #2, #3, #4)
  - [x] Create `apps/web/src/components/filter-dropdown.tsx`
  - [x] Create `apps/web/src/components/filter-dropdown.module.css`
  - [x] Implement dropdown with three options: "Untagged", "Tagged", "All"
  - [x] Use native `<select>` element for browser accessibility
  - [x] Style to match existing design system (CSS variables)
  - [x] Emit filter value via callback prop `onFilterChange`

- [x] Task 2: Add filter state to main page (AC: #1, #2, #3, #4)
  - [x] Add `filter` state with type `'untagged' | 'tagged' | 'all'`
  - [x] Initialize filter to `'untagged'` (default per AC#4)
  - [x] Add `handleFilterChange` callback function
  - [x] Place FilterDropdown above VideoList in left panel

- [x] Task 3: Implement client-side filtering logic (AC: #1, #2, #3)
  - [x] Create `filteredVideos` computed value using `useMemo`
  - [x] Filter by `video.isTagged` property from Video interface
  - [x] Pass `filteredVideos` to VideoList instead of raw `videos`
  - [x] Preserve selected video when filter changes (if still visible)

- [x] Task 4: Update VideoList to show filter context (AC: #1, #2, #3)
  - [x] Update empty state message based on current filter:
    - "Untagged": "All videos have been tagged!"
    - "Tagged": "No tagged videos yet"
    - "All": "No videos found in library"

- [x] Task 5: Verify build and functionality (AC: #1, #2, #3, #4)
  - [x] Run `npm run build` to verify no TypeScript errors
  - [x] Test filter switching with mock data
  - [x] Verify default "Untagged" selection on load
  - [x] Verify selection persistence across filter changes

## Dev Notes

### Architecture Compliance

This story implements **FR2** from the PRD:
- FR2: Santiago can see which videos have already been tagged vs untagged

From Architecture document:
- Next.js App Router with `apps/web/src/app/` structure
- CSS Modules for scoped styling (use existing CSS variables from globals.css)
- React useState + useMemo for state management (no external libraries)
- Native HTML elements for accessibility

### File Structure

```
apps/web/src/
├── app/
│   ├── page.tsx           # Add filter state and handler
│   └── page.module.css    # May need minor layout updates
└── components/
    ├── filter-dropdown.tsx         # NEW
    ├── filter-dropdown.module.css  # NEW
    ├── video-list.tsx              # Update empty state messages
    └── video-list.module.css       # No changes expected
```

### Naming Conventions (from Architecture)

- Files: kebab-case (`filter-dropdown.tsx`, `filter-dropdown.module.css`)
- Components: PascalCase (`FilterDropdown`)
- Functions/variables: camelCase (`handleFilterChange`, `filteredVideos`)
- CSS classes in modules: camelCase (`filterContainer`, `filterSelect`)

### Component Interface

**FilterDropdown Component:**
```typescript
type FilterValue = 'untagged' | 'tagged' | 'all';

interface FilterDropdownProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}
```

### Existing CSS Variables (from globals.css)

Use these for consistent styling:
```css
:root {
  --color-primary: #007bff;
  --color-primary-dark: #0056b3;
  --color-background: #f8f9fa;
  --color-border: #e9ecef;
  --color-text: #212529;
  --color-text-muted: #6c757d;
  --color-white: #ffffff;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --radius-md: 8px;
}
```

### Video Interface (from shared package)

```typescript
interface Video {
  id: string;
  filename: string;
  isTagged: boolean;  // Use this for filtering
  path: string;
  thumbnailUrl?: string;
}
```

### UX Specifications (from UX Design)

**Filter Dropdown Placement:**
- Located at bottom of left panel below video list
- Simple dropdown: "Untagged" / "Tagged" / "All"
- Default selection: "Untagged" (so Santiago sees untagged first)

**From UX Design wireframe:**
```
│  ☐ video_005.mp4           │
│  ...                        │
│                             │
│  [Show: Untagged ▼]        │  <-- Filter goes here
```

### Previous Story Learnings (Story 2.2)

1. **CSS Variables** - All CSS now uses theme tokens from globals.css
2. **Keyboard Accessibility** - Added tabIndex, role, aria attributes - maintain same standards
3. **Focus States** - Use `outline: 2px solid var(--color-primary)` pattern
4. **Loading Skeleton** - Loading state uses shimmer animation (filter not affected during load)
5. **Error Handling** - TypeError for network errors, AbortError for timeouts

### Implementation Notes

1. **Client-Side Filtering** - Filter in browser, not via API. The API returns all videos with `isTagged` boolean. Filter on the client to avoid additional API calls.

2. **useMemo for Performance** - Wrap filter logic in useMemo to avoid recalculating on every render:
   ```typescript
   const filteredVideos = useMemo(() => {
     if (filter === 'all') return videos;
     return videos.filter(v => filter === 'tagged' ? v.isTagged : !v.isTagged);
   }, [videos, filter]);
   ```

3. **Selection Persistence** - When filter changes, check if selectedVideo is in filteredVideos. If not, clear selection or select first available.

4. **Native Select for Accessibility** - Use `<select>` element with proper `<label>` for screen reader support. Style with CSS to match design.

### DO NOT

- Do NOT add search functionality (not in scope for MVP)
- Do NOT add sorting options (just filtering)
- Do NOT fetch filtered data from API (filter client-side)
- Do NOT use a third-party dropdown library (use native select)
- Do NOT add filter count badges (keep it simple)
- Do NOT persist filter selection to localStorage (resets to "Untagged" on refresh)

### References

- [Source: planning-artifacts/architecture.md#Frontend Architecture]
- [Source: planning-artifacts/ux-design-specification.md#Video List]
- [Source: planning-artifacts/epics.md#Story 2.3]
- [Source: implementation-artifacts/2-2-video-list-display.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes

1. **FilterDropdown Component** - Created new component with native `<select>` element for accessibility. Uses CSS variables from globals.css for consistent styling. Includes custom dropdown arrow SVG and focus states matching existing patterns.

2. **Filter State Management** - Added `filter` state initialized to `'untagged'` per AC#4. Implemented `handleFilterChange` callback that clears selection when video is no longer in filtered results.

3. **Client-Side Filtering** - Used `useMemo` to filter videos based on `isTagged` property. Filtering logic: 'untagged' shows `!v.isTagged`, 'tagged' shows `v.isTagged`, 'all' shows all videos.

4. **VideoList Updates** - Added `emptyMessage` prop with default value. Updated empty state to display context-aware messages based on current filter.

5. **Layout Updates** - Added `videoListWrapper` class to contain VideoList and FilterDropdown together. Updated VideoList container to use `flex: 1` instead of `height: 100%` to work with flex layout.

6. **Build Verification** - Full project build passes with no TypeScript errors. All workspaces (api, web, shared) compile successfully.

## File List

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/components/filter-dropdown.tsx` | Created | FilterDropdown component with native select |
| `apps/web/src/components/filter-dropdown.module.css` | Created | CSS Module styles for filter dropdown |
| `apps/web/src/components/video-list.tsx` | Modified | Added emptyMessage prop with default value |
| `apps/web/src/components/video-list.module.css` | Modified | Changed container to flex: 1 for wrapper layout |
| `apps/web/src/app/page.tsx` | Modified | Added filter state, useMemo filtering, FilterDropdown integration |
| `apps/web/src/app/page.module.css` | Modified | Added videoListWrapper class for filter/list container |

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-03 | Story created with comprehensive developer context | SM Agent |
| 2026-01-03 | Story implemented - all tasks complete, build verified | Dev Agent |
| 2026-01-03 | Code review fixes: Added tagged indicator (checkmark), removed redundant aria-label, hidden filter during loading | Dev Agent |
