---
stepsCompleted: [1, 2, 3]
inputDocuments: []
session_topic: 'Project scope clarity - essential vs nice-to-have, eliminating unnecessary complexity'
session_goals: 'Define a clear, focused scope that solves the core problem without over-engineering'
selected_approach: 'ai-recommended'
techniques_used: ['First Principles Thinking', 'Resource Constraints', 'Assumption Reversal']
ideas_generated: [12]
context_file: ''
technique_execution_complete: true
---

# Brainstorming Session Results

**Facilitator:** Jeremiah
**Date:** 2026-01-02

## Session Overview

**Topic:** Project scope clarity - identifying essential vs. nice-to-have features, eliminating unnecessary complexity

**Goals:** Define a clear, focused scope that solves the core problem without over-engineering

### Context

Family video digitization project with two potential components:
1. Video Extraction Pipeline - Extract videos from ~70-100 DVDs, convert to MP4
2. Metadata Web App - Simple interface for non-technical family member to add structured metadata for Jellyfin

Target: "Santiago y Armida Productions" library on existing Jellyfin/NAS

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Scope clarity with focus on eliminating over-engineering

**Recommended Techniques:**
1. **First Principles Thinking** - Strip assumptions, identify core truths
2. **Resource Constraints** - Force-rank by asking "if only ONE thing..."
3. **Assumption Reversal** - Validate scope by flipping each element

---

## Technique Execution Results

### First Principles Thinking

**Core Problem Identified:**
Family memories are trapped on ~70-100 DVDs in an inaccessible format. Multiple generations (kids, spouse, aging relatives) cannot easily view them on demand. Current DVDs are poorly organized with minimal labeling.

**Fundamental Truths:**
1. Videos have emotional/historical value to multiple generations
2. Current access is poor (physical media, no organization)
3. Viewing infrastructure exists (NAS + Jellyfin already set up)
4. DVDs contain chapter markers in IFO files - segmentation data exists
5. Only the relative who recorded these knows what's in each video

**Key Insight:** Extraction/segmentation is largely solved (IFO files have chapter data). The real bottleneck is **metadata entry** - someone needs to watch and tag each clip.

---

### Resource Constraints

**Critical Question:** If you could only build ONE thing?

**Answer:** Metadata management UI (not DVD extraction pipeline)

**Rationale:** Extraction can be done manually/scripted. Without a way for the relative to efficiently tag videos remotely, the project stalls regardless of how many videos are extracted.

**MVP Feature Prioritization (forced choice of 3):**
1. Video preview (via Jellyfin link - not embedded player)
2. Title field
3. Date picker

**Tiered Roadmap:**

| Tier | Features |
|------|----------|
| **MVP** | Video list, Jellyfin link, Title, Date |
| **V1** | People multi-select, Rating (1-10), Description, Carry-forward |
| **V2** | Auto-rename/move on save, Mobile support |
| **Future** | Jellyfin plugin approach, Location dropdown |

---

### Assumption Reversal

**Reversal 1: No custom UI?**
- Verdict: Won't work
- Relative is remote, non-technical, would get lost in Jellyfin's default metadata editor

**Reversal 2: You do the tagging?**
- Verdict: Won't scale
- 1000+ clips, you're not available, and you enjoy building software

**Reversal 3: Folder-level tags instead of per-video?**
- Verdict: Loses value
- Individual clips matter for Jellyfin browsing experience

**Reversal 4: No embedded video preview?**
- Verdict: **Acceptable for MVP**
- "Open in Jellyfin" link is sufficient - avoids video player complexity
- **This significantly simplifies the MVP**

---

## Final Scope Definition

### What We're Building

**Primary Deliverable:** Simple metadata tagging webapp for home videos

**Target User:** Non-technical family member, working remotely on laptop

**Usage Pattern:** 25-50 videos per session, sequential tagging

### MVP Scope (Ship First)

| Feature | Implementation |
|---------|----------------|
| Video list | Show untagged videos from Jellyfin library |
| Video preview | Link to open in Jellyfin (not embedded) |
| Title field | Text input |
| Date picker | Date selector for "when filmed" |
| Save | Write NFO file for Jellyfin |

### Out of Scope (For Now)

| Item | Reason |
|------|--------|
| DVD extraction pipeline | Separate concern, can be scripted/manual |
| Embedded video player | Jellyfin link is sufficient |
| Mobile-first design | Laptop is primary device |
| Auto-rename/move | V2 feature |

### Research Items

- Jellyfin plugin architecture - could this replace standalone webapp?
- NFO file format specifics for home video metadata
- Jellyfin API for reading library and triggering refresh

---

## Key Decisions

1. **Metadata UI is the project** - extraction is out of scope
2. **MVP is minimal** - list + link + title + date
3. **Video preview = Jellyfin link** - no embedded player complexity
4. **Relative tags remotely** - simple enough they won't need hand-holding
