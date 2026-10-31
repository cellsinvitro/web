# ─── Stage 1: Builder ───────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install openssl for Prisma engines
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package manifests and scripts first for efficient Docker layer caching
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/
COPY scripts/ ./scripts/

# Install dependencies for all workspaces
RUN npm ci

# Copy the full source code
COPY . .

# Generate Prisma Client and build the server (tsc)
RUN npm run build --workspace=server

# ─── Stage 2: Production Runner ────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install runtime dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built server code from the builder stage
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

# Start server (with optional automated migrations if AUTO_MIGRATE=true is configured)
CMD ["sh", "-c", "if [ \"$AUTO_MIGRATE\" = \"true\" ]; then npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma; fi && node apps/server/dist/index.js"]

