FROM node:20-bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg procps \
  libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo-gobject2 libcups2 \
  libdrm2 libgbm1 libgdk-pixbuf2.0-0 libgtk-3-0 libgtk-4-1 libnspr4 libnss3 \
  libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
  libxfixes3 libxi6 libxrandr2 libxrender1 libxshmfence1 libxss1 libxtst6 \
  fonts-liberation chromium \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd -r sazumi && useradd -r -g sazumi -G audio,video sazumi
WORKDIR /app
COPY --chown=sazumi:sazumi package*.json ./
RUN npm ci --omit=dev
ARG CACHE_BUST=2025-09-30T11:02
ENV CACHE_BUST=$CACHE_BUST
COPY --chown=sazumi:sazumi . .
USER sazumi
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage --headless=new --disable-gpu"
EXPOSE 3000
CMD ["node", "server.js"]
