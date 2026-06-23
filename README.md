# excalidraw-self-host-storage

[![Backend tests](https://github.com/OhMaley/excalidraw-self-host-storage/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/OhMaley/excalidraw-self-host-storage/actions/workflows/backend-tests.yml)
[![Frontend quality](https://github.com/OhMaley/excalidraw-self-host-storage/actions/workflows/frontend-quality.yml/badge.svg)](https://github.com/OhMaley/excalidraw-self-host-storage/actions/workflows/frontend-quality.yml)
[![OpenAPI quality](https://github.com/OhMaley/excalidraw-self-host-storage/actions/workflows/openapi-quality.yml/badge.svg)](https://github.com/OhMaley/excalidraw-self-host-storage/actions/workflows/openapi-quality.yml)
[![CodeQL](https://github.com/OhMaley/excalidraw-self-host-storage/actions/workflows/codeql.yml/badge.svg)](https://github.com/OhMaley/excalidraw-self-host-storage/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A self-hosted backend for [Excalidraw](https://github.com/excalidraw/excalidraw) that adds persistent storage, multi-user workspaces, and drawing collections — authenticated via Keycloak.

The vanilla Excalidraw app is ephemeral by design. This project wraps it with a storage layer so drawings survive browser refreshes, are organised into collections, and can be shared across a team through workspace membership.

## Architecture

```mermaid
graph TD
    Browser["Browser<br/><small>React 19 · Vite · keycloak-js</small>"]
    Keycloak["Keycloak<br/><small>OIDC / RS256 JWT</small>"]
    Backend["Backend<br/><small>Rust · axum · sqlx</small>"]
    Postgres[("PostgreSQL")]
    FS[("File storage<br/><small>drawings & thumbnails</small>")]

    Browser -- "HTTPS (JWT bearer)" --> Backend
    Browser -- "OIDC login / token refresh" --> Keycloak
    Backend -- "JWKS key fetch" --> Keycloak
    Backend -- "sqlx queries" --> Postgres
    Backend -- "read / write files" --> FS
```

**Stack at a glance**

| Layer     | Technology                               |
|-----------|------------------------------------------|
| Frontend  | React 19 · TypeScript · Vite · Radix UI  |
| Backend   | Rust (edition 2024) · axum 0.8 · sqlx 0.9|
| Auth      | Keycloak · OIDC · RS256 JWT              |
| Database  | PostgreSQL 15                            |
| Storage   | Local filesystem (pluggable)             |

## Features

- **Workspaces** — shared spaces with role-based access (owner / admin / member); a personal workspace is created automatically on first sign-in.
- **Collections** — group and organise drawings inside a workspace.
- **Drawings** — create, edit, and auto-save Excalidraw diagrams with thumbnail previews generated after each save.
- **Navigation sidebar** — browse workspaces, collections, and drawings without leaving the editor.
- **OpenAPI contract** — the full API is described in [`openapi/openapi.yaml`](openapi/openapi.yaml) and published to GitHub Pages.

## Prerequisites

- **Docker** and **Docker Compose** (local development)
- A running **Keycloak** instance with a configured realm and client
- **Node.js 22** and **npm** (frontend development)
- **Rust 1.94+** and **sqlx-cli** (backend development)

## Local development

### 1. Clone and configure

```bash
git clone https://github.com/OhMaley/excalidraw-self-host-storage.git
cd excalidraw-self-host-storage
```

Copy the environment templates and fill in the required values:

```bash
cp docker/.env.template docker/.env
cp frontend/.env.template frontend/.env
```

### 2. Start the backing services

```bash
docker compose -f docker/docker-compose.yml up -d keycloak keycloakdb appdb migrator
```

Wait for the migrator to exit cleanly (it runs `sqlx migrate run` and stops), then start the backend:

```bash
docker compose -f docker/docker-compose.yml up backend
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app is available at `http://localhost:5173` by default.

## Configuration

### Backend environment variables

| Variable               | Required | Default       | Description |
|------------------------|----------|---------------|-------------|
| `DATABASE_URL`         | **Yes**  | —             | PostgreSQL connection string |
| `KEYCLOAK_ISSUER`      | **Yes**  | —             | Keycloak realm issuer URL (e.g. `https://auth.example.com/realms/myrealm`) |
| `KEYCLOAK_JWKS_URL`    | **Yes**  | —             | Keycloak JWKS endpoint (e.g. `…/realms/myrealm/protocol/openid-connect/certs`) |
| `KEYCLOAK_AUDIENCE`    | No       | *(skip check)*| Expected `aud` claim in JWT tokens; recommended for production |
| `CORS_ALLOWED_ORIGINS` | No       | *(deny all)*  | Comma-separated allowed origins, or `*` to allow all |
| `PORT`                 | No       | `3000`        | HTTP listen port |
| `STORAGE_LOCAL_PATH`   | No       | `./drawings`  | Directory for drawing files and thumbnails |
| `RUST_LOG`             | No       | `info`        | Log level filter (`error`, `warn`, `info`, `debug`, `trace`) |

### Frontend environment variables

| Variable                  | Required | Default         | Description |
|---------------------------|----------|-----------------|-------------|
| `VITE_KEYCLOAK_URL`       | **Yes**  | —               | Keycloak base URL (e.g. `https://auth.example.com`) |
| `VITE_KEYCLOAK_REALM`     | **Yes**  | —               | Keycloak realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | **Yes**  | —               | Keycloak client ID |
| `VITE_API_BASE`           | No       | *(same origin)* | Backend API base URL; leave empty when frontend and backend share an origin |

## Building for production

**Backend**

```bash
cd backend
cargo build --release
# or use the multi-stage Dockerfile:
docker build -t excalidraw-storage-backend .
```

The production image is a minimal Alpine container running as a non-root user.

**Frontend**

```bash
cd frontend
npm ci
npm run build   # outputs to frontend/dist/
```

Serve `dist/` with any static file server. Point `VITE_API_BASE` at your backend if they are on different origins, and configure `CORS_ALLOWED_ORIGINS` accordingly.

**Database migrations**

Migrations run automatically via the `migrator` Docker service, or manually:

```bash
cd backend
sqlx migrate run
```

## Working with sqlx

This project uses sqlx in **offline mode** (`SQLX_OFFLINE=true`): query metadata is cached in `backend/.sqlx/` and checked into the repository so that CI can build and type-check without a live database.

**Whenever you add, modify, or delete a `sqlx::query!` / `query_as!` macro**, regenerate the cache against a running database:

```bash
# from backend/
DATABASE_URL=postgres://user:pass@localhost:5432/excalidraw \
  cargo sqlx prepare -- --all-targets
```

The `-- --all-targets` flag is required so that queries inside `#[cfg(test)]` blocks are included in the cache. Without it, `cargo test` will fail in CI.

Commit the updated files in `backend/.sqlx/` together with your code changes.

**Running tests** also requires a live database with migrations applied:

```bash
# Apply migrations first
DATABASE_URL=postgres://user:pass@localhost:5432/excalidraw \
  sqlx migrate run

# Then run the test suite
DATABASE_URL=postgres://user:pass@localhost:5432/excalidraw \
  cargo test
```

The Docker Compose stack brings up a ready-to-use `appdb` service and runs migrations via the `migrator` container, so the quickest way to get a test database is:

```bash
docker compose -f docker/docker-compose.yml up -d appdb migrator
# wait for migrator to exit, then:
DATABASE_URL=postgres://$(grep APP_DB_USER docker/.env | cut -d= -f2):$(grep APP_DB_PASSWORD docker/.env | cut -d= -f2)@localhost:5432/excalidraw \
  cargo test
```

## API documentation

The OpenAPI spec lives at [`openapi/openapi.yaml`](openapi/openapi.yaml) and is published at:

**https://ohmaley.github.io/excalidraw-self-host-storage/**

## Development reference

| Command | What it does |
|---------|-------------|
| `cd frontend && npm run lint` | ESLint + SonarJS |
| `cd frontend && npm run type-check` | TypeScript type check |
| `cd frontend && npm run build` | Production build |
| `cd frontend && npm run openapi:lint` | Validate the OpenAPI spec |
| `cd backend && cargo sqlx prepare -- --all-targets` | Regenerate sqlx offline query cache (includes test queries) |
| `cd backend && cargo test` | Run backend tests (requires `DATABASE_URL`) |
| `cd backend && cargo audit` | Audit Rust dependencies for CVEs |

## License

MIT — see [LICENSE](LICENSE).
