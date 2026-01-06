# Docker Build Notes - API Image

## Problem: DVD Upload Dependencies

The API Docker image needs `ffmpeg` and `lsdvd` for DVD chapter extraction (Story 8.5). These tools have complex dependency chains that frequently break during Docker builds.

### Failed Approaches

1. **Alpine packages (`apk add ffmpeg`)** - Dependencies on X11, VA-API, DRM libraries pull in dozens of packages and conflict with Alpine 3.21
2. **Downloading during build (`wget` in Dockerfile)** - DNS resolution fails in Docker builds, especially with Alpine package repositories

## Solution: Local Vendor + Static Binaries + Debian Base

The final working approach uses:
1. **Debian-based images** (more reliable package management)
2. **Pre-downloaded vendor files** (avoids network issues during build)
3. **Multi-stage builds** (keeps final image size reasonable)

### Vendor Directory

**Location:** `apps/api/vendor/`

**Contents:**
- `lsdvd-0.17.tar.gz` - Source code for lsdvd
- `ffmpeg-release-amd64-static.tar.xz` - Static ffmpeg binary (~40MB)

### 1. lsdvd - Build from Source

**Source:** https://downloads.sourceforge.net/project/lsdvd/lsdvd/lsdvd-0.17.tar.gz

**Dockerfile approach:**
```dockerfile
# Stage 2: Build lsdvd from source (Debian-based for reliability)
FROM debian:bookworm-slim AS lsdvd-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libdvdread-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
# Copy pre-downloaded lsdvd source and build
COPY apps/api/vendor/lsdvd-0.17.tar.gz .
RUN tar xzf lsdvd-0.17.tar.gz \
    && cd lsdvd-0.17 \
    && ./configure --prefix=/usr \
    && make \
    && make DESTDIR=/lsdvd-install install
```

Then in the production stage:
```dockerfile
COPY --from=lsdvd-builder /lsdvd-install/usr/bin/lsdvd /usr/local/bin/lsdvd
```

### 2. ffmpeg - Static Binary (Pre-downloaded)

**Source:** https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz

**Why pre-downloaded?** Network issues during Docker builds can cause wget failures. Storing locally ensures reliable builds.

**Dockerfile approach:**
```dockerfile
# Copy pre-downloaded static ffmpeg binary
COPY apps/api/vendor/ffmpeg-release-amd64-static.tar.xz /tmp/
RUN cd /tmp \
    && tar xf ffmpeg-release-amd64-static.tar.xz \
    && mv ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ \
    && mv ffmpeg-*-amd64-static/ffprobe /usr/local/bin/ \
    && rm -rf ffmpeg-* \
    && chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe
```

### Runtime Dependencies

Only `libdvdread8` and `xz-utils` are needed at runtime:
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    libdvdread8 \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*
```

## Build Command

```bash
docker build --platform linux/amd64 --no-cache \
  -t ghcr.io/jeremiah-mitchell/family-video-tagger-api:latest \
  -f apps/api/Dockerfile .
```

**Flags:**
- `--platform linux/amd64` - Target NAS architecture
- `--no-cache` - Clean build to pick up Dockerfile changes

## Updating Vendor Files

### To update lsdvd:
```bash
cd apps/api/vendor
curl -L -o lsdvd-0.17.tar.gz \
  https://downloads.sourceforge.net/project/lsdvd/lsdvd/lsdvd-0.17.tar.gz
```

### To update ffmpeg:
```bash
cd apps/api/vendor
curl -L -o ffmpeg-release-amd64-static.tar.xz \
  https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
```

## Multi-Stage Build Summary

The API Dockerfile uses 3 stages:

| Stage | Base Image | Purpose |
|-------|-----------|---------|
| `builder` | node:20-slim | Build TypeScript app |
| `lsdvd-builder` | debian:bookworm-slim | Compile lsdvd from source |
| `production` | node:20-slim | Final image with runtime deps |

**Why Debian instead of Alpine?**
- More reliable package management (apt vs apk)
- Better DNS resolution during package fetches
- Wider package availability
- Minimal size increase (~20MB) for significantly better reliability

## Git Considerations

The vendor files are large (~42MB total). Consider:
1. Adding to `.gitignore` and documenting download instructions
2. Using Git LFS for large files
3. Keeping in repo for CI/CD reliability (current approach)

## Verification

After building, verify tools are installed:
```bash
docker run --rm ghcr.io/jeremiah-mitchell/family-video-tagger-api:latest \
  /bin/sh -c "ffmpeg -version && lsdvd -V"
```
