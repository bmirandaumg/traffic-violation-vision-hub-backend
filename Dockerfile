# syntax=docker/dockerfile:1.6

FROM node:20-bookworm-slim AS base
WORKDIR /app

# Sharp + Tesseract need native libs; dumb-init handles PID 1 signals
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    libvips42 \
    tesseract-ocr \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig*.json ./
COPY index.ts ./ 
COPY business-logic ./business-logic
COPY modules ./modules
COPY metrics ./metrics
COPY spa.traineddata ./tessdata/spa.traineddata
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    TESSDATA_PREFIX=/app/tessdata \
    PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/tessdata ./tessdata
RUN mkdir -p images processed-images reports \
 && useradd --system --uid 1001 watcher \
 && chown -R watcher:watcher /app
USER watcher
VOLUME ["/app/images", "/app/processed-images", "/app/reports"]
EXPOSE 3000
CMD ["dumb-init", "node", "dist/index.js"]
