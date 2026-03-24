# ─── Dockerfile for Smart Farm NestJS Backend ──────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm install --production=false

# Copy source code
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["node", "dist/main.js"]
