# Family Video Upload Project

Web app to process family home video DVDs (VIDEO_TS folders) on UGREEN NAS: parse chapters from IFO files, split VOBs, encode to MP4, add metadata, and generate Jellyfin-compatible NFO sidecars.

## Status

🚧 **In Development** - Using BMAD Method for planning and implementation

## Overview

This app streamlines the workflow for digitizing family home videos from DVD:

1. Upload VIDEO_TS folder via web UI
2. Auto-parse chapters from IFO files
3. Preview and select chapters to encode
4. Add metadata (title, date, people, event type)
5. Background encode to H.264 MP4
6. Generate Jellyfin NFO sidecars
7. Output to media library folder

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Simple HTML/CSS
- **IFO Parsing**: lsdvd
- **Encoding**: ffmpeg (H.264)
- **Queue**: SQLite + background worker
- **Container**: Docker (Debian base)

## Development

Documentation and planning artifacts are in the `.bmad/` directory.

## License

Private family project
