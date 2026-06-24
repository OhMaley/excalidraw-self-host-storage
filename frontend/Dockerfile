# Production image: builds the Vite SPA and serves the static output.
#
# WARNING: the VITE_* build args below are compiled into the JS bundle at
# `docker build`/`docker compose build` time (Vite build-time constants).
# They are NOT read from the running container's environment — changing one
# requires rebuilding this image, restarting the container alone has no effect.

FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID
ARG VITE_DEBUG=false

ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID \
    VITE_DEBUG=$VITE_DEBUG

COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
