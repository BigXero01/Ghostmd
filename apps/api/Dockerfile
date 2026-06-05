FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/
RUN npm ci --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -- --filter=@ghostmd/types
RUN npm run build -- --filter=@ghostmd/utils
RUN npm run build -- --filter=@ghostmd/api

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S ghostmd && adduser -S ghostmd -G ghostmd
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

USER ghostmd
EXPOSE 4000
CMD ["node", "dist/main"]
