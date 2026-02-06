FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/ ./scripts/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
