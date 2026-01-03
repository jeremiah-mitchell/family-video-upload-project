# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build shared package first, then web app
RUN npm run build --workspace=@family-video/shared
RUN npm run build --workspace=@family-video/web

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose web port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "apps/web/server.js"]
