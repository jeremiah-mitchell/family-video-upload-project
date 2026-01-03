---
stepsCompleted: [1]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Jellyfin Plugin Development for Metadata UI'
research_goals: 'Determine if building a Jellyfin plugin is easier than a standalone webapp for home video metadata tagging'
user_name: 'Jeremiah'
date: '2026-01-02'
web_research_enabled: true
source_verification: true
---

# Research Report: Jellyfin Plugin Development

**Date:** 2026-01-02
**Author:** Jeremiah
**Research Type:** Technical

---

## Research Overview

**Question:** Is building a Jellyfin plugin easier than a standalone webapp for a simplified home video metadata tagging interface?

**Context:**
- Need a simple UI for non-technical family member to tag home videos
- MVP features: video list, link to Jellyfin, title field, date picker, save to NFO
- Jellyfin 10.10/10.11 introduced significant changes
- First-time plugin developer

**Research Scope:**
1. Jellyfin plugin architecture and capabilities
2. What changed in 10.10/10.11
3. Can plugins provide custom UI pages?
4. Complexity comparison: plugin vs standalone webapp
5. Recommendation

---

## Technical Research Scope Confirmation

**Research Topic:** Jellyfin Plugin Development for Metadata UI
**Research Goals:** Determine if building a Jellyfin plugin is easier than a standalone webapp for home video metadata tagging

**Scope Confirmed:** 2026-01-02

---

## Findings

### 1. Jellyfin Plugin Architecture Overview

Jellyfin plugins are written in **.NET (C#)** and extend the server-side functionality. Key capabilities include:

| Capability | How |
|------------|-----|
| Custom REST APIs | `ControllerBase` - standard ASP.NET Web API |
| Metadata providers | `IMetadataSaver`, `IExternalId` interfaces |
| Scheduled tasks | `IScheduledTask` interface |
| Authentication | `IAuthenticationProvider` interface |
| Background services | `IHostedService` interface |
| Configuration pages | `IHasWebPages` interface |

**Source:** [Jellyfin Plugin Template](https://github.com/jellyfin/jellyfin-plugin-template)

**Key Limitation:** Plugins are **server-side only**. They cannot directly modify the Jellyfin web UI.

---

### 2. Can Plugins Add Custom UI Pages?

**Not natively.** Jellyfin's plugin system does not include built-in support for adding custom web pages to the UI.

**However**, there is a community solution:

#### Plugin Pages (Third-Party)

A community plugin called **[jellyfin-plugin-pages](https://github.com/IAmParadox27/jellyfin-plugin-pages)** enables other plugins to add custom user-facing pages while maintaining the server's theme and styling.

**Requirements:**
- Jellyfin 10.10.6+ compatible
- Depends on "File Transformation" plugin (minimum v2.2.1.0)
- Configuration via `config.json` file
- C# (82.3% of codebase)

**Limitations:**
- Third-party, not officially supported
- Version compatibility is strict (one version per Jellyfin release)
- Developer maintains "momentum-based" schedule with potential gaps
- 85 stars, 4 forks - small community

**Verdict:** Possible but adds complexity and dependency risk.

---

### 3. Jellyfin 10.10/10.11 Breaking Changes

**10.11.0 (October 2025)** introduced **massive backend changes**:

| Change | Impact on Plugins |
|--------|-------------------|
| **EF Core mandatory** | All database access MUST use Entity Framework Core. Raw SQL no longer accepted. |
| **New experimental DB API** | Plugins can provide custom database access, but marked "HIGHLY experimental" - stability expected in 10.12.0 |
| **Deprecated playback APIs** | `OnPlaybackStart`, `OnPlaybackProgress`, `OnPlaybackStopped` deprecated → use `Report*` versions |
| **New APIs** | `GetSystemStorage`, `BackupApi` added |

**Source:** [Jellyfin 10.11.0 Release Notes](https://jellyfin.org/posts/jellyfin-release-10.11.0/)

**Impact:** Plugin development is in flux. The database layer changes mean older plugin examples may not work. Documentation is catching up.

---

### 4. NFO File Handling in Jellyfin

Jellyfin natively supports reading/writing NFO files:

- Enable "Nfo saver" in library settings
- Metadata changes via web UI are written to NFO if enabled
- NFO changes require manual rescan or wait for detection
- Custom provider IDs supported with `<PROVIDER_NAMEid>` tags

**Source:** [Jellyfin NFO Documentation](https://jellyfin.org/docs/general/server/metadata/nfo/)

**For your use case:** A plugin could write metadata AND update NFO files, or a standalone webapp could directly write NFO files (simpler).

---

### 5. Jellyfin REST API for Metadata

Jellyfin exposes a REST API that can:
- List library items
- Get/update item metadata
- Trigger library scans

**Key endpoint:** `POST /Items/{itemId}` with `BaseItemDto` payload

**Source:** [Jellyfin API - ItemUpdate](https://github.com/shamelin/go-jellyfin-api-client/blob/main/docs/ItemUpdateAPI.md)

**For standalone webapp:** You can build a webapp that calls the Jellyfin API directly - no plugin needed.

---

## Comparison: Plugin vs Standalone Webapp

| Factor | Jellyfin Plugin | Standalone Webapp |
|--------|-----------------|-------------------|
| **Language** | C# (.NET 8/9) required | Any (JS, Python, Go, etc.) |
| **Custom UI** | Requires third-party Plugin Pages + File Transformation plugins | Full control - any framework |
| **Learning curve** | Steep - .NET, Jellyfin internals, EF Core (10.11+ changes) | Low - just REST API calls |
| **Deployment** | Copy DLL to plugins folder, restart Jellyfin | Docker container, any hosting |
| **Maintenance** | Must update for each Jellyfin release (breaking changes common) | Stable - API is versioned |
| **Dependencies** | Tied to Jellyfin's .NET version and EF Core | Independent |
| **Video playback** | Native Jellyfin playback via links | Link to Jellyfin (same outcome) |
| **NFO writing** | Can hook into Jellyfin's metadata system OR write directly | Write NFO files directly |
| **First-timer friendly** | No - significant learning curve | Yes - standard webapp dev |

---

## Recommendation

**Build a standalone webapp, not a Jellyfin plugin.**

**Reasons:**

1. **Plugin UI is not straightforward** - You'd need Plugin Pages (third-party) + File Transformation (dependency) just to get custom pages. This adds fragility.

2. **10.11 breaking changes** - The EF Core migration means plugin development is unstable right now. Documentation and examples are catching up.

3. **Jellyfin API is sufficient** - Everything you need (list videos, update metadata, trigger refresh) is available via REST API. No plugin required.

4. **NFO files are simple** - You can write NFO XML files directly alongside videos. Jellyfin will read them on next scan.

5. **Development speed** - A React/Vue/Svelte webapp calling Jellyfin API can be built in days. A C# plugin with custom UI integration would take significantly longer.

6. **Maintenance burden** - Plugins often break between Jellyfin versions. A standalone app using the stable API won't.

---

## Recommended Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  Your Webapp        │────▶│  Jellyfin API       │
│  (React/Vue/etc)    │     │  - List items       │
│  - Simple tag UI    │     │  - Get metadata     │
│  - Jellyfin links   │     │  - Update metadata  │
│  - NFO generation   │     │  - Trigger refresh  │
└─────────────────────┘     └─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  NAS/Jellyfin       │
│  media folder       │
│  - Write NFO files  │
└─────────────────────┘
```

---

## Sources

- [Jellyfin Plugin Template](https://github.com/jellyfin/jellyfin-plugin-template)
- [Jellyfin Plugin Pages](https://github.com/IAmParadox27/jellyfin-plugin-pages)
- [Jellyfin 10.11.0 Release Notes](https://jellyfin.org/posts/jellyfin-release-10.11.0/)
- [Jellyfin 10.10.0 Release Notes](https://jellyfin.org/posts/jellyfin-release-10.10.0/)
- [Jellyfin NFO Metadata Documentation](https://jellyfin.org/docs/general/server/metadata/nfo/)
- [Jellyfin ItemUpdate API](https://github.com/shamelin/go-jellyfin-api-client/blob/main/docs/ItemUpdateAPI.md)
- [awesome-jellyfin](https://github.com/awesome-jellyfin/awesome-jellyfin)
