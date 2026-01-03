---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - "analysis/brainstorming-session-2026-01-02.md"
  - "planning-artifacts/research/technical-jellyfin-plugin-research-2026-01-02.md"
date: 2026-01-02
author: Jeremiah
---

# Product Brief: family-video-upload-project

## Executive Summary

Family-video-upload-project is a metadata tagging webapp that enables a non-technical family member to catalog decades of home videos stored on DVDs, making them discoverable and browsable through an existing Jellyfin media server. The solution bridges the gap between inaccessible physical media and modern streaming convenience, preserving family memories for current and future generations.

---

## Core Vision

### Problem Statement

Approximately 70-100 DVDs containing irreplaceable family memories sit inaccessible in storage. Finalized DVDs require manual laptop playback with no way to know what's on them without guessing. Unfinalized DVDs are completely inaccessible without technical extraction. The only person who knows what's in these videos - the relative who recorded them - has no practical way to catalog them for the rest of the family.

### Problem Impact

- **Lost memories**: Kids can't see themselves as toddlers; grandparents can't relive moments they've forgotten
- **Degrading media**: DVDs have a finite lifespan; delay increases risk of permanent loss
- **Knowledge bottleneck**: The relative who filmed these is the only one who can identify content - that knowledge could be lost
- **Inaccessible content**: Some DVDs (unfinalized) literally cannot be viewed without extraction

### Why Existing Solutions Fall Short

- **Jellyfin's built-in metadata editor**: Too complex for a non-technical user; requires navigating server administration interfaces
- **Manual DVD playback**: No discovery, no organization, requires physical media and compatible hardware
- **Generic media managers**: Designed for movies/TV with external metadata sources; home videos have no external data to pull

### Proposed Solution

A standalone webapp with a radically simplified interface: show a list of untagged videos, provide a link to watch in Jellyfin, and offer just two fields - title and date. The relative can work through videos remotely at their own pace, and metadata is saved as NFO files that Jellyfin automatically reads.

### Key Differentiators

- **Single-purpose simplicity**: Not a general media manager - built specifically for the "watch and tag" workflow
- **Non-technical user focus**: No server configuration, no complex UI - just a list, a video link, and two fields
- **Jellyfin-native integration**: Uses Jellyfin API for video listing and NFO files for metadata - no proprietary data formats
- **Remote-friendly**: Relative can tag from anywhere with Jellyfin access

---

## Target Users

### Primary User: Santiago (The Tagger)

**Profile:** Santiago is the family member who recorded these videos over the years. He's comfortable with basic web interfaces but gets frustrated when workflows require switching between multiple apps or navigating complex settings. He works remotely on a laptop and has time to work through the video library.

**Context:**
- Only person who can identify what's in each video (he was behind the camera)
- Comfortable with simple web forms, email, basic browsing
- Gets thrown off by app-switching or complex multi-step workflows
- Will work through videos at his own pace, likely in sessions of 25-50 videos

**Pain Points:**
- Jellyfin's built-in metadata editor is too complex
- No simple way to contribute video context to the family library
- Knowledge of video contents is locked in his memory with no easy way to capture it

**Success Looks Like:**
- Opens one webpage, sees a list of untagged videos
- Clicks to watch in Jellyfin, comes back, types title and date, saves
- Repeats until done - no confusion, no context-switching

### Secondary Users: Family Viewers

**Profile:** Jeremiah's kids and other family members who will browse and watch the cataloged videos through Jellyfin. They don't interact with the tagging webapp at all.

**Context:**
- Use Jellyfin to browse the "Santiago y Armida Productions" library
- Benefit from Santiago's tagging work through better discoverability
- Primary value: discovering old memories, seeing themselves as kids, connecting with family history

**Success Looks Like:**
- Open Jellyfin, browse by title/date, find videos of interest
- Watch and enjoy without needing to know how the metadata got there

### Administrator: Jeremiah (Set and Forget)

**Profile:** Sets up the infrastructure (NAS, Jellyfin, webapp) and walks away. Not a daily user of the tagging interface.

**Context:**
- Technical user who deploys and maintains the system
- Primary role is initial setup and occasional troubleshooting
- Success = Santiago can use it independently without hand-holding

---

## Success Metrics

### Primary Success Metric

**Santiago Independence:** Santiago can use the webapp to tag videos without requiring assistance from Jeremiah. This is the single most important measure of success.

**Indicators:**
- Santiago completes first tagging session without asking for help
- No support requests after initial walkthrough
- Santiago voluntarily returns for additional tagging sessions

### User Success Metrics

| Metric | Target | How We'll Know |
|--------|--------|----------------|
| Zero-confusion onboarding | Santiago tags first video without guidance | Observation during first session |
| Session completion | Santiago finishes a session without abandoning | No mid-session complaints or confusion |
| Return usage | Santiago comes back voluntarily | Multiple sessions over time |
| Task efficiency | Tag a video in under 2 minutes (watch time excluded) | Simple enough that tagging doesn't feel like work |

### Project Completion Metrics

| Metric | Value |
|--------|-------|
| Total videos to tag | ~1,500 clips (100 DVDs x 15 clips avg) |
| Completion timeline | No deadline - Santiago's pace |
| Success threshold | Any videos tagged > current state (zero) |

### What Success Is NOT

- **Not speed:** There's no rush. Santiago should enjoy the process.
- **Not 100% completion:** Even partial tagging improves discoverability.
- **Not perfection:** A rough title and approximate date is better than nothing.

---

## MVP Scope

### Core Features

| Feature | Description |
|---------|-------------|
| **Video list** | Display untagged videos from the Jellyfin "Santiago y Armida Productions" library |
| **Video preview** | Link to open video in Jellyfin (not embedded player) |
| **Title field** | Text input for descriptive video title |
| **Date picker** | Date selector for "when filmed" |
| **People field** | Multi-select for family members in the video |
| **Rating field** | 1-10 scale for video quality/importance |
| **Description field** | Free text for additional context |
| **Save** | Write metadata to NFO file, trigger Jellyfin refresh |

### Out of Scope for MVP

| Feature | Reason | Future Tier |
|---------|--------|-------------|
| DVD extraction pipeline | Separate concern, can be scripted/manual | N/A |
| Embedded video player | Jellyfin link is sufficient, avoids complexity | Future |
| Mobile-first design | Santiago uses laptop | V2 |
| Auto-rename/move on save | Nice-to-have, not essential | V2 |
| Carry-forward defaults | Optimization for later | V1 |
| Location dropdown | Lower priority metadata | Future |

### MVP Success Criteria

- Santiago can tag a video end-to-end without help
- NFO files are written correctly and Jellyfin reads them
- All 5 metadata fields save and display in Jellyfin
- Workflow feels simple: list → watch → tag → save → next

### Future Vision

**V1 Enhancements:**
- Carry-forward defaults (copy previous video's people/date to next)
- Bulk tagging for videos from same session

**V2 Enhancements:**
- Auto-rename/move files on save
- Mobile-responsive design
- Progress tracking (X of 1,500 tagged)

**Future Possibilities:**
- Location/event dropdown with saved presets
- Embedded video preview (skip Jellyfin tab)
- Family member management UI
