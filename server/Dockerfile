# ==============================================================================
# EventHub Backend Production Dockerfile
# Multi-stage optimized container for Node.js 20+ Express + Prisma
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma engine on Alpine
RUN apk add --no-cache openssl

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate --schema=prisma/schema.postgresql.prisma

# Final production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma runtime on Alpine
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=5000

# Create unprivileged application user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependencies and generated Prisma client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
COPY src ./src
COPY docker-healthcheck.sh ./

# Create uploads directory with write permissions and set executable script
RUN mkdir -p uploads && chmod +x docker-healthcheck.sh && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD /bin/sh /app/docker-healthcheck.sh

CMD ["node", "src/server.js"]

