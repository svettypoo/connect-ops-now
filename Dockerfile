# Stage 1: Install dependencies (cached as its own layer until package.json changes)
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Serve static output
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist

RUN npm install -g serve

EXPOSE 3000
ENV PORT=3000

CMD ["serve", "dist", "-s", "-l", "3000"]
