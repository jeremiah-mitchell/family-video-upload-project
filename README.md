# Family Video Tagger

Metadata tagging webapp for cataloging home videos in Jellyfin.

## Status

🚧 **In Development** - Using BMAD Method for planning and implementation

## Overview

This application provides a simple interface for tagging home videos stored in Jellyfin with metadata like titles, dates, people, and descriptions. Metadata is saved as NFO files alongside the video files.

## Project Structure

```
/
├── apps/
│   ├── web/          # Next.js frontend (App Router)
│   └── api/          # NestJS backend
└── packages/
    └── shared/       # Shared types and Zod schemas
```

## Prerequisites

- Node.js 20.x LTS
- npm 10.x
- Docker & Docker Compose (for deployment)
- Access to Jellyfin server

## Development

### Install dependencies

```bash
npm install
```

### Run frontend

```bash
npm run dev
```

### Run backend

```bash
npm run dev:api
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `JELLYFIN_URL` - Jellyfin server URL
- `JELLYFIN_API_KEY` - Jellyfin API key
- `MEDIA_PATH` - Path to media files (for NFO writing)

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, CSS Modules
- **Backend:** NestJS 10, TypeScript
- **Monorepo:** npm workspaces
- **Deployment:** Docker Compose

## Documentation

Planning artifacts are in the `_bmad-output/` directory.

## License

Private family project
