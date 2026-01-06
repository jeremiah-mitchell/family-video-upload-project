# Stage 1: Build Node.js app
FROM node:20-slim AS builder

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build shared package first, then API
RUN npm run build --workspace=@family-video/shared
RUN npm run build --workspace=@family-video/api

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

# Stage 3: Production
FROM node:20-slim AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install runtime dependencies for lsdvd
RUN apt-get update && apt-get install -y --no-install-recommends \
    libdvdread8 \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-downloaded static ffmpeg binary
COPY apps/api/vendor/ffmpeg-release-amd64-static.tar.xz /tmp/
RUN cd /tmp \
    && tar xf ffmpeg-release-amd64-static.tar.xz \
    && mv ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ \
    && mv ffmpeg-*-amd64-static/ffprobe /usr/local/bin/ \
    && rm -rf ffmpeg-* \
    && chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

# Copy lsdvd from builder stage
COPY --from=lsdvd-builder /lsdvd-install/usr/bin/lsdvd /usr/local/bin/lsdvd

# Don't run as root
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nestjs

# Copy root package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Set ownership
RUN chown -R nestjs:nodejs /app

# Set working directory to api app
WORKDIR /app/apps/api

USER nestjs

# Expose API port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]
