FROM sagemath/sagemath:latest
USER root

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy compiled TypeScript (run `npm run build` on the host first)
COPY build/ ./build/

# Copy locale files
COPY source/locales/ ./source/locales/

# Switch back to sage user for security
USER sage

# Set environment variables
ENV TRANSPORT=http
# Bind all interfaces inside the container; the compose file decides what the
# host publishes. The server refuses to start unless API_KEY is set.
ENV HOST=0.0.0.0
ENV PORT=3000
ENV SAGE_TIMEOUT=120000
ENV SAGE_LOCALE=en

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "build/index.js"]