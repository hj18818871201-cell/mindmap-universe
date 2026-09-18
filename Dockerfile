FROM node:22-bookworm-slim

WORKDIR /app

# curl downloads generated scene images; Noto provides Chinese glyphs for subtitles/cards.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && npm prune --omit=dev \
  && mkdir -p /data/media \
  && chown -R node:node /data/media

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    MEDIA_ROOT=/data/media

USER node
EXPOSE 3001

CMD ["npm", "start"]
