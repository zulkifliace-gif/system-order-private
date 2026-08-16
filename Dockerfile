# ============================================================
# LajuQ F&B Order System — Docker Image
# Multi-stage build:
#   Stage 1: Build React frontend (Vite)
#   Stage 2: Production Node.js backend + built frontend
# ============================================================

# ---------------------------------------------------------
# STAGE 1: Build frontend
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

# VITE_ env vars must be set at BUILD time
ARG VITE_STAFF_PIN=1234
ENV VITE_STAFF_PIN=$VITE_STAFF_PIN

RUN npm run build

# ---------------------------------------------------------
# STAGE 2: Production backend
# ---------------------------------------------------------
FROM node:20-alpine AS production

# build tools for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install backend dependencies
COPY fb-order-backend/package.json fb-order-backend/package-lock.json ./fb-order-backend/
WORKDIR /app/fb-order-backend
RUN npm ci --prefer-offline && npm rebuild better-sqlite3 --build-from-source

WORKDIR /app

# Copy backend source
COPY fb-order-backend/server.js ./fb-order-backend/
COPY fb-order-backend/database.js ./fb-order-backend/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Copy public assets (favicon, logo, audio)
COPY public/ ./public/

# Create required folders
RUN mkdir -p fb-order-backend/data \
             fb-order-backend/uploads/menu-images \
             fb-order-backend/uploads/banners

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

VOLUME ["/app/fb-order-backend/data", "/app/fb-order-backend/uploads"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "fb-order-backend/server.js"]
