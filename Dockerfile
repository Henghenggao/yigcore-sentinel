# ============================================================================
# Yigcore Sentinel - Production Dockerfile
# Multi-stage build for minimal image size (~100MB)
# ============================================================================

# Stage 1: Build TypeScript
FROM node:20-alpine AS builder

WORKDIR /build

# Copy dependency manifests
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ============================================================================
# Stage 2: Production runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S sentinel && \
    adduser -u 1001 -S sentinel -G sentinel

# Copy built files and production dependencies from builder
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./

# Copy default policy configuration
COPY policy.json ./

# Set ownership to non-root user
RUN chown -R sentinel:sentinel /app

# Switch to non-root user
USER sentinel

# Expose default port
EXPOSE 11435

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:11435/health || exit 1

# Environment variables with defaults
ENV NODE_ENV=production \
    PORT=11435 \
    HOST=0.0.0.0 \
    DEFAULT_BUDGET=10.0 \
    RATE_LIMIT_CAPACITY=100 \
    RATE_LIMIT_REFILL_RATE=10 \
    LOG_LEVEL=info

# Start the server
CMD ["node", "dist/server.js"]
