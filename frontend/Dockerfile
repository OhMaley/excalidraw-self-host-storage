# Production image: builds the Vite SPA and serves the static output.
#
# The image is environment-agnostic: Keycloak/API settings are read from the
# container's environment at startup and written to /config.js by
# docker/40-runtime-config.sh (see src/services/config.ts). Required env vars:
# KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID. Optional: API_BASE.

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
# Owned by the unprivileged nginx user (uid 101) so the entrypoint script can
# overwrite config.js at startup.
COPY --from=builder --chown=101:0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
EXPOSE 8080