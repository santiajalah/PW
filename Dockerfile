FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg procps \
  libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo-gobject2 libcups2 \
  libdrm2 libgbm1 libgdk-pixbuf2.0-0 libgtk-3-0 libgtk-4-1 libnspr4 libnss3 \
  libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 \
  libxfixes3 libxi6 libxrandr2 libxrender1 libxshmfence1 libxss1 libxtst6 \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub \
     | gpg --dearmor -o /etc/apt/keyrings/google-linux.gpg \
  && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-linux.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
     > /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd -r sazumi && useradd -r -g sazumi -G audio,video sazumi
WORKDIR /app
COPY --chown=sazumi:sazumi package*.json ./
RUN npm ci --omit=dev

ARG CACHE_BUST=2025-09-30T10:58
ENV CACHE_BUST=$CACHE_BUST

COPY --chown=sazumi:sazumi . .

USER sazumi
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
ENV CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage --headless=new --disable-gpu"

EXPOSE 3000
CMD ["node", "server.js"]
