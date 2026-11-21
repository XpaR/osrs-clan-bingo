FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && mkdir -p /data

ENV NODE_ENV=production
ENV PORT=4317
ENV DATABASE_PATH=/data/bingo.sqlite

EXPOSE 4317

CMD ["npm", "start"]
