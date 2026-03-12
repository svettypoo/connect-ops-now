# Stage 1: Install ALL deps (frontend + backend, including native modules)
# Use Debian slim — better native module support than Alpine (no musl issues with bcrypt/better-sqlite3)
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build frontend (Vite)
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runtime
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy backend files (from builder which has all source)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/ ./server/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/phone-mockup*.html ./
COPY --from=builder /app/dl ./dl

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server/server.js"]
