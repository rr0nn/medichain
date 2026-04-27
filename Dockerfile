# Shared Node + pnpm base.
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies once for reuse across later stages.
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build Prisma client and production app bundle with build-only placeholders.
FROM deps AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Needed for Prisma client generation during build.
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

# Safe placeholders for build-time env checks.
ARG NEO4J_URI=bolt://localhost:7687
ARG NEO4J_USERNAME=neo4j
ARG NEO4J_PASSWORD_PLACEHOLDER=password
ARG NEO4J_DATABASE=neo4j
ARG GOOGLE_GENERATIVE_AI_API_KEY_PLACEHOLDER=dummy

# Generate Prisma client at build time.
RUN DATABASE_URL=$DATABASE_URL pnpm prisma generate

# Build the production Next.js bundle.
RUN DATABASE_URL=$DATABASE_URL \
    NEO4J_URI=$NEO4J_URI \
    NEO4J_USERNAME=$NEO4J_USERNAME \
    NEO4J_PASSWORD=$NEO4J_PASSWORD_PLACEHOLDER \
    NEO4J_DATABASE=$NEO4J_DATABASE \
    GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY_PLACEHOLDER \
    pnpm build

# Minimal runtime image.
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Run as non-root.
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs

# Copy only runtime assets.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
