# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Accept env vars as build args for React
ARG REACT_APP_API_URL
ARG REACT_APP_BOT_NAME
ARG REACT_APP_BOT_TAGLINE
ARG REACT_APP_ACCENT
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_BOT_NAME=$REACT_APP_BOT_NAME
ENV REACT_APP_BOT_TAGLINE=$REACT_APP_BOT_TAGLINE
ENV REACT_APP_ACCENT=$REACT_APP_ACCENT

COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

# Nginx config with SPA routing and env injection
RUN cat > /etc/nginx/conf.d/app.conf << 'NGINXCONF'
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
NGINXCONF

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
