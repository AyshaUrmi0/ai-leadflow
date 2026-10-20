# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1: Base image
# Uses Node 22 on Alpine Linux (~50MB base).
# openssl is required by Prisma's runtime query engine on Alpine musl.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Enable pnpm via Corepack matching the packageManager in package.json
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

# -----------------------------------------------------------------------------
# Stage 2: Dependencies installation
# Copies dependency manifests and installs with frozen lockfile.
# Cached across builds if package.json and pnpm-lock.yaml are unchanged.
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: Builder (App compilation & migration runner target)
# Generates Prisma client, compiles Next.js standalone build, and holds
# all tooling needed for migrations (prisma CLI) and database seeding (tsx).
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Dummy DATABASE_URL for build-time static page collection
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN pnpm exec prisma generate
RUN pnpm build

# -----------------------------------------------------------------------------
# Stage 4: Production Runner (pure standalone)
# Minimal final runtime image containing ONLY the compiled Next.js standalone
# bundle and public assets. No compilers, no devDependencies, no pnpm cache.
# Runs as an unprivileged non-root user (UID 1001) for container security.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

# openssl is needed by Prisma's query engine inside the standalone bundle
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Listening on 0.0.0.0 binds to all network interfaces so traffic can reach the container
ENV HOSTNAME="0.0.0.0"

# Create unprivileged system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone bundle
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Container healthcheck testing that the Next.js server is responding to HTTP requests
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/ || exit 1

# Node is PID 1, receiving Unix signals (SIGTERM/SIGINT) directly for graceful shutdown
CMD ["node", "server.js"]
