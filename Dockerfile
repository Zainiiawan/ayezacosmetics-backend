# ==========================================
# AYEZA COSMETICS — Backend Dockerfile
# ==========================================
# Build context: backend/ folder
# Railway: set Root Directory to "backend"

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build \
  && test -f dist/index.js \
  && echo "✅ Build OK: dist/index.js"

# ---- Runner ----
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN test -f dist/index.js \
  && echo "✅ Runner ready"

EXPOSE 8080

CMD ["node", "dist/index.js"]
