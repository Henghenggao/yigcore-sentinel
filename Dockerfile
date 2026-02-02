# ============================================================================
# Yigcore Sentinel - Production Dockerfile
# Multi-stage build for minimal image size
# ============================================================================

# Stage 1: Build server (TypeScript)
FROM node:20-alpine AS server-builder

WORKDIR /build

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build
RUN npm prune --production

# Stage 2: Build dashboard (React + Vite)
FROM node:20-alpine AS dashboard-builder

WORKDIR /build

COPY dashboard/package*.json ./
RUN npm ci

COPY dashboard/ ./
RUN npx vite build

# Stage 3: Production runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S sentinel && \
    adduser -u 1001 -S sentinel -G sentinel

# Copy server build
COPY --from=server-builder /build/dist ./dist
COPY --from=server-builder /build/node_modules ./node_modules
COPY --from=server-builder /build/package.json ./

# Copy dashboard build
COPY --from=dashboard-builder /build/dist ./dashboard/dist

# Copy default policy configuration
COPY policy.json ./

# Set ownership to non-root user
RUN chown -R sentinel:sentinel /app

USER sentinel

EXPOSE 11435

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:11435/health || exit 1

ENV NODE_ENV=production \
    PORT=11435 \
    HOST=0.0.0.0 \
    DEFAULT_BUDGET=10.0 \
    RATE_LIMIT_CAPACITY=100 \
    RATE_LIMIT_REFILL_RATE=10 \
    LOG_LEVEL=info

CMD ["node", "dist/server.js"]
