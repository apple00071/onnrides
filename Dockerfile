FROM node:18-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-symbola \
    fonts-noto \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome executable path
ENV CHROME_BIN=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY whatsapp-service/package*.json ./whatsapp-service/

# Install dependencies
RUN npm install
RUN cd whatsapp-service && npm install

# Copy app source
COPY . .

# Build the app
RUN npm run build

# Start the app
CMD ["npm", "start"] 