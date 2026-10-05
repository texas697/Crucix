FROM node:22-alpine

WORKDIR /app

# Install production deps first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source
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
