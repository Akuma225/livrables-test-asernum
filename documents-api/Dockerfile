FROM node:20-bookworm AS builder
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

# Dépendances
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Sources
COPY . .

# Prisma + build Nest
RUN pnpm prisma generate
RUN pnpm build

# Ne garder que les deps de prod
RUN pnpm prune --prod


FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Prisma (engine) a besoin de libssl/openssl dans l'image runtime
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["node", "dist/src/main.js"]

