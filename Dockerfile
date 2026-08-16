# ============================================================
# LajuQ F&B Order System — Dockerfile
# Multi-stage build:
#   Stage 1: Build React Frontend (Vite)
#   Stage 2: Production Backend (Node.js Alpine + SQLite)
# ============================================================

# ---------------------------------------------------------
# STAGE 1: Build React Frontend
# ---------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source files needed for Vite build
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Pass build-time arguments (Vite requires VITE_ prefix)
ARG VITE_STAFF_PIN=1234
ENV VITE_STAFF_PIN=$VITE_STAFF_PIN

# Run production build (outputs to /app/dist)
RUN npm run build

# ---------------------------------------------------------
# STAGE 2: Production Backend & Runtime
# ---------------------------------------------------------
FROM node:20-alpine AS production

# Install build tools required for better-sqlite3 C++ native addon compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install backend dependencies & compile better-sqlite3 for Alpine
COPY fb-order-backend/package.json fb-order-backend/package-lock.json ./fb-order-backend/
WORKDIR /app/fb-order-backend
RUN npm ci --prefer-offline && npm rebuild better-sqlite3 --build-from-source

WORKDIR /app

# Copy backend source code
COPY fb-order-backend/server.js ./fb-order-backend/
COPY fb-order-backend/database.js ./fb-order-backend/

# Copy built frontend assets from Stage 1 into /app/dist
COPY --from=frontend-builder /app/dist ./dist

# Copy public static assets (favicons, logos, notification sounds)
COPY public/ ./public/

# Prepare persistent data directories
RUN mkdir -p fb-order-backend/data \
             fb-order-backend/uploads/menu-images \
             fb-order-backend/uploads/banners

# Runtime Environment Variables
ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/app/fb-order-backend/data/fb_ordering.db

# Expose single port for HTTP, REST API & WebSocket (Socket.io)
EXPOSE 5000

# Persistent Volumes
VOLUME ["/app/fb-order-backend/data", "/app/fb-order-backend/uploads"]

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start Server
CMD ["node", "fb-order-backend/server.js"]
