---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - "planning-artifacts/prd.md"
  - "planning-artifacts/product-brief-family-video-upload-project-2026-01-02.md"
  - "planning-artifacts/research/technical-jellyfin-plugin-research-2026-01-02.md"
  - "analysis/brainstorming-session-2026-01-02.md"
workflowType: 'ux-design'
lastStep: 14
designApproach: minimal
status: complete
---

# UX Design Specification - family-video-upload-project

**Author:** Jeremiah
**Date:** 2026-01-02

---

## Executive Summary

A minimal metadata tagging webapp for Santiago to catalog ~1,500 home videos for Jellyfin. Single user, single purpose, no frills.

**Core Workflow:** List → Watch (Jellyfin tab) → Tag → Save → Next

**Target User:** Santiago - Non-technical, laptop user, comfortable with basic web forms.

**Success Metric:** Uses it without help after initial walkthrough.

---

## Design Approach

| Principle | Application |
|-----------|-------------|
| Clean and standard | No custom branding, default browser styling |
| Single page | Video list + form, nothing else |
| Browser defaults | Native date picker, standard buttons, system fonts |
| Functional over beautiful | Works reliably > looks fancy |

---

## Page Layout

Single page with two-column layout (desktop):

```
┌─────────────────────────────────────────────────────────────┐
│  Family Video Tagger                                        │
├─────────────────────────────┬───────────────────────────────┤
│                             │                               │
│  VIDEO LIST                 │  TAGGING FORM                 │
│                             │                               │
│  ☐ video_001.mp4           │  Title: [________________]    │
│  ☐ video_002.mp4           │                               │
│  ● video_003.mp4  ← selected│  Date:  [____-__-__]         │
│  ☐ video_004.mp4           │                               │
│  ☐ video_005.mp4           │  People: [Select people ▼]    │
│  ...                        │                               │
│                             │  Rating: [1-10 slider/select] │
│  [Show: Untagged ▼]        │                               │
│                             │  Description:                 │
│                             │  [                    ]       │
│                             │  [                    ]       │
│                             │                               │
│                             │  [Watch in Jellyfin]  [Save]  │
│                             │                               │
├─────────────────────────────┴───────────────────────────────┤
│  Tagged: 0 / 1,500                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## UI Components

### Video List (Left Panel)

| Element | Implementation |
|---------|----------------|
| List display | Simple scrollable list with filename |
| Selection | Click to select, highlight selected row |
| Tagged indicator | Checkmark or different color for tagged videos |
| Filter | Dropdown: "Untagged" / "Tagged" / "All" |

### Tagging Form (Right Panel)

| Field | Input Type | Notes |
|-------|------------|-------|
| Title | Text input | Required |
| Date | Native date picker | `<input type="date">` |
| People | Multi-select | Checkboxes or tag-style picker |
| Rating | Number input or slider | 1-10 scale |
| Description | Textarea | Optional, 2-3 rows |

### Actions

| Button | Behavior |
|--------|----------|
| **Watch in Jellyfin** | Opens video in new tab |
| **Save** | Writes NFO file, triggers Jellyfin refresh, shows confirmation |

### Feedback

| State | Display |
|-------|---------|
| Save success | "Saved!" message (auto-dismiss after 2s) |
| Save error | Red error message with retry option |
| Loading | Simple spinner or "Loading..." text |

---

## Interaction Flow

1. Page loads → Video list populates from Jellyfin API
2. Santiago clicks a video → Video highlighted, form loads any existing metadata
3. Santiago clicks "Watch in Jellyfin" → New tab opens with video
4. Santiago watches, returns to tagger tab → Form state preserved
5. Santiago fills in fields → Standard form entry
6. Santiago clicks "Save" → NFO written, Jellyfin refreshed, "Saved!" shown
7. Video moves to "tagged" → Next untagged video auto-selected (or manual selection)

---

## Styling Guidelines

| Element | Style |
|---------|-------|
| Font | System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) |
| Colors | Browser defaults, minimal custom colors |
| Buttons | Standard button styling, primary action slightly emphasized |
| Spacing | Comfortable padding, nothing cramped |
| Borders | Light borders for separation where needed |

**No custom color palette required.** Use browser defaults with minor adjustments for clarity.

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | Tab through form fields, Enter to save |
| Form labels | All inputs have visible labels |
| Focus indicators | Browser default focus rings |
| Error messages | Associated with form fields |

---

## States & Error Handling

| Scenario | UI Response |
|----------|-------------|
| Jellyfin unavailable | "Could not connect to Jellyfin. Check your connection." |
| Save fails | "Could not save. Try again." + Retry button |
| Video inaccessible | Skip to next or show "Video unavailable" |
| Form incomplete | Highlight required field, "Title is required" |

---

## Out of Scope (MVP)

- Mobile responsive design
- Dark mode
- Keyboard shortcuts beyond basics
- Drag-and-drop
- Embedded video player
- Bulk tagging UI
- Progress gamification
