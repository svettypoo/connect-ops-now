# Stage 1: Install ALL deps (frontend + backend, including native modules)
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build frontend (Vite)
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy backend files
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY package.json ./

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server/server.js"]
