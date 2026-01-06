# Sprint Change Proposal: Remote Access via Cloudflare Tunnel

**Date:** 2026-01-05
**Change Trigger:** Story 6.2 completion (production deployment on NAS)
**Scope Classification:** Minor (direct implementation by dev team)

---

## Section 1: Issue Summary

### Problem Statement
The Family Video Tagger application is deployed and operational on the local NAS (`10.0.0.4`), but is only accessible from the local network. Santiago needs to tag videos remotely when not at home.

### Context
- Discovered during post-deployment: remote access was implicitly expected but not included in original scope
- Existing infrastructure: cloudflared tunnel running on minipc (`10.0.0.3`)
- Target URL: `syap.losbisquets.xyz` (already in use for other services)

### Evidence
- User confirmed: "I need to be able to access this app remotely"
- Cloudflare Access MFA already configured for other tunnel routes
- Architecture document mentions Cloudflare Access but implementation was deferred

---

## Section 2: Impact Analysis

### Epic Impact
- **No existing epics affected** - All 6 epics remain complete
- **New Epic 7** required for remote access functionality

### Story Impact
- No changes to completed stories
- 3 new stories needed (defined below)

### Artifact Conflicts
| Artifact | Impact | Changes Needed |
|----------|--------|----------------|
| PRD | None | Remote access was mentioned in constraints |
| Architecture | Minor | Add tunnel route to deployment diagram |
| UI/UX | None | No UI changes required |

### Technical Impact
- `NEXT_PUBLIC_API_URL` must use external hostname instead of internal IP
- API CORS must allow `syap.losbisquets.xyz` origin
- Docker image rebuild required with updated environment

---

## Section 3: Recommended Approach

**Selected Path:** Direct Adjustment (Option 1)

### Rationale
- Simple configuration changes only
- No code changes required (just environment/CORS updates)
- No impact on existing functionality
- Infrastructure (cloudflared) already in place on minipc

### Effort Estimate: Low
- 2-3 hours total implementation time

### Risk Level: Low
- Cloudflare Access provides existing MFA protection
- No database or persistent data changes
- Easy rollback (remove tunnel route)

### Cloudflare ToS Clarification
Video streaming through Cloudflare Tunnel for personal use is acceptable:
- Tunnels don't cache content (unlike CDN)
- Personal media server use case with single user
- No commercial video hosting

---

## Section 4: Detailed Change Proposals

### New Epic 7: Remote Access

#### Story 7.1: Configure Cloudflare Tunnel Routes
**Status:** Ready for development

**Acceptance Criteria:**
- [ ] Add tunnel route: `syap.losbisquets.xyz` → `http://10.0.0.4:3000` (web app)
- [ ] Add tunnel route: `jellyfin-syap.losbisquets.xyz` → `http://10.0.0.4:8096` (Jellyfin)
- [ ] Cloudflare Access policy applied to both routes (existing MFA)
- [ ] Routes use NAS IP (`10.0.0.4`) since cloudflared runs on minipc

**Implementation Notes:**
```yaml
# cloudflared config addition (on minipc)
ingress:
  - hostname: syap.losbisquets.xyz
    service: http://10.0.0.4:3000
  - hostname: jellyfin-syap.losbisquets.xyz
    service: http://10.0.0.4:8096
```

---

#### Story 7.2: Update API CORS and Frontend URL Configuration
**Status:** Ready for development

**Acceptance Criteria:**
- [ ] API CORS allows `https://syap.losbisquets.xyz` origin
- [ ] Frontend `NEXT_PUBLIC_API_URL` points to `https://syap.losbisquets.xyz/api` (or proxied)
- [ ] "Watch in Jellyfin" links use `https://jellyfin-syap.losbisquets.xyz`
- [ ] Environment variables documented for remote deployment

**Code Changes:**
```typescript
// apps/api/src/main.ts - CORS update
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://10.0.0.4:3000',
    'https://syap.losbisquets.xyz'
  ],
});
```

---

#### Story 7.3: Rebuild and Deploy with Remote Configuration
**Status:** Ready for development

**Acceptance Criteria:**
- [ ] Docker images rebuilt with remote URL configuration
- [ ] Images pushed to GHCR
- [ ] NAS containers updated via Portainer
- [ ] Remote access verified end-to-end

**Build Command:**
```bash
NEXT_PUBLIC_API_URL=https://syap.losbisquets.xyz/api docker build \
  -t ghcr.io/losbisquets/family-video-tagger-web:latest \
  -f apps/web/Dockerfile .
```

---

## Section 5: Implementation Handoff

### Scope: Minor
Direct implementation by development team.

### Handoff Recipients
| Role | Responsibility |
|------|----------------|
| Developer | Stories 7.1, 7.2, 7.3 implementation |
| User (Jeremiah) | cloudflared config access, Portainer deployment |

### Success Criteria
1. `https://syap.losbisquets.xyz` loads the Family Video Tagger
2. Cloudflare Access MFA prompts on first access
3. Video list loads (API connection working)
4. Save metadata works end-to-end
5. "Watch in Jellyfin" opens `https://jellyfin-syap.losbisquets.xyz`

### Dependencies
- Access to cloudflared config on minipc
- Portainer access on NAS
- Cloudflare Access policy configuration

---

## Approval

**Status:** Pending user approval

**Next Steps After Approval:**
1. Update sprint-status.yaml with Epic 7 stories
2. Begin Story 7.1 (tunnel configuration)
3. Implement Story 7.2 (API/frontend updates)
4. Execute Story 7.3 (rebuild and deploy)
