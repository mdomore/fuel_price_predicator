# Stage 1: Build the React frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# Copy package files first for better caching
COPY frontend/package*.json ./
RUN npm ci --only=production=false

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend dependencies
FROM node:18-alpine as backend-deps

WORKDIR /app/backend

# Copy package files first for better caching
COPY backend/package*.json ./
RUN npm ci --only=production

# Stage 3: Final image with nginx and node
FROM node:18-alpine

# Install nginx and supervisor in one layer
RUN apk add --no-cache nginx supervisor && \
    mkdir -p /var/log/nginx /var/log/backend

WORKDIR /app

# Copy backend code and dependencies
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build /usr/share/nginx/html

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]

