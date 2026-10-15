# syntax=docker/dockerfile:1
# Multi-stage build: compile the React frontend with dev dependencies, then ship a runtime image with
# production dependencies only. React/React DOM stay in the runtime image because the public pages
# are server-rendered in P7.

FROM node:22.12-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.12-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install production deps first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled frontend (manifest + hashed assets) from the build stage
COPY --from=build /app/dashboard/dist ./dashboard/dist

# Copy source (dashboard/dist is excluded from the build context; the build stage output wins)
COPY . .

# Persistent state (sweep history, delta memory). Mount a volume here in the cloud.
ENV RUNS_DIR=/data/runs
RUN mkdir -p /data/runs && chown -R node:node /data /app
USER node

# Default port — cloud hosts inject PORT; the server honors it
EXPOSE 3117

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3117}/api/healthz" || exit 1

CMD ["node", "server.mjs"]
