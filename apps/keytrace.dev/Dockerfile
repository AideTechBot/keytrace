FROM node:22-slim AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --immutable

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && yarn build

# Production image
FROM base AS runner
ENV NODE_ENV=production

# Copy built assets and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/server ./src/server

# Scaleway expects port 8080
ENV PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
