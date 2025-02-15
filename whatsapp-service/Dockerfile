# Use Node.js 18 slim as base image
FROM node:18-slim

# Install Chrome dependencies and SQLite3
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p data

# Expose port
EXPOSE 3001

# Start the service
CMD ["npm", "start"] 