# SageMath MCP Server
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:18-slim
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# SageMath is required for actual computation
# Install SageMath in the container or mount from host
RUN apt-get update && apt-get install -y --no-install-recommends \
    sagemath \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV TRANSPORT=stdio

ENTRYPOINT ["node", "build/index.js"]
