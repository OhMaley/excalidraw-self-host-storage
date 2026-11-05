#!/usr/bin/env bash
# Server-side deploy script — install into the server's deploy directory
# (see docker/DEPLOY.md). Deploys or rolls back to a published image version.
#
# All paths are relative to this script's own directory, so it works from any
# location. Messages never print the absolute path: CI logs are public.
#
#   ./deploy.sh v1.4.0            # a release tag
#   ./deploy.sh sha-<40 hex>      # a main-branch build
#
# When used as an SSH forced command (authorized_keys `command="..."`), the
# version comes from SSH_ORIGINAL_COMMAND, which is untrusted input — it is
# validated against a strict pattern before being used anywhere.
#
# Steps: fetch the compose file at the matching git ref, pull images, back up
# the DB + drawings, switch APP_VERSION, `up -d` (migrator runs before the
# backend), then health-check. It does NOT roll back automatically: on
# failure it prints the command to redeploy the previous version.
set -euo pipefail
umask 077

REPO="OhMaley/excalidraw-self-host-storage"
KEEP_BACKUPS=5
HEALTH_TIMEOUT_SECONDS=60

die() { echo "deploy: $*" >&2; exit 1; }

VERSION="${1:-${SSH_ORIGINAL_COMMAND:-}}"
if [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]]; then
    GIT_REF="$VERSION"
elif [[ "$VERSION" =~ ^sha-[0-9a-f]{40}$ ]]; then
    GIT_REF="${VERSION#sha-}"
else
    die "usage: deploy.sh <vX.Y.Z | sha-<40 hex>> (got: '${VERSION}')"
fi

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"
[[ -f .env.prod ]] || die ".env.prod not found in the deploy directory"
touch .env.version

exec 9>.deploy.lock
flock -n 9 || die "another deploy is already running"

compose() {
    local file="$1"; shift
    docker compose -f "$file" --env-file .env.prod --env-file .env.version "$@"
}

env_value() {
    grep -E "^$1=" .env.prod | tail -n1 | cut -d= -f2- || true
}

PREVIOUS="$(grep -E '^APP_VERSION=' .env.version | cut -d= -f2- || true)"
echo "deploy: ${PREVIOUS:-<none>} -> $VERSION"

# 1. Compose file matching this version, so service definitions never drift
#    from the images. Staged as .new until the deploy is committed to.
curl -fsSL --proto '=https' \
    "https://raw.githubusercontent.com/$REPO/$GIT_REF/docker/docker-compose.prod.yml" \
    -o docker-compose.prod.yml.new \
    || die "could not fetch docker-compose.prod.yml at $GIT_REF"

# 2. Pull first: nothing running is touched if an image is missing.
APP_VERSION="$VERSION" compose docker-compose.prod.yml.new pull migrator backend frontend

# 3. Backups (skipped on first deploy, when nothing is running yet).
#    These stay on this server — they protect against a bad migration, not
#    against losing the server. Keep a separate off-site backup.
mkdir -p backups
stamp="$(date +%Y%m%d-%H%M%S)"
if [[ -n "$(docker ps -q -f name='^appdb$')" ]]; then
    docker exec appdb sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
        | gzip > "backups/appdb-$stamp-before-$VERSION.sql.gz.partial"
    mv "backups/appdb-$stamp-before-$VERSION.sql.gz.partial" "backups/appdb-$stamp-before-$VERSION.sql.gz"
    echo "deploy: database backed up"
fi
if [[ -n "$(docker ps -q -f name='^backend$')" ]]; then
    docker exec backend tar czf - -C /storage/drawings . \
        > "backups/drawings-$stamp-before-$VERSION.tar.gz.partial"
    mv "backups/drawings-$stamp-before-$VERSION.tar.gz.partial" "backups/drawings-$stamp-before-$VERSION.tar.gz"
    echo "deploy: drawings backed up"
fi

# 4. Commit to the new version.
mv docker-compose.prod.yml.new docker-compose.prod.yml
echo "APP_VERSION=$VERSION" > .env.version

on_failure() {
    echo "deploy: FAILED deploying $VERSION" >&2
    echo "deploy: from the deploy directory:" >&2
    echo "deploy: logs:     docker compose -f docker-compose.prod.yml --env-file .env.prod --env-file .env.version logs migrator backend" >&2
    if [[ -n "$PREVIOUS" ]]; then
        echo "deploy: rollback: ./deploy.sh $PREVIOUS" >&2
        echo "deploy: (if a migration ran, check it is compatible with $PREVIOUS, or restore backups/appdb-$stamp-*)" >&2
    fi
}
trap on_failure ERR

# 5. Restart. The migrator must exit 0 before the backend starts; if it
#    fails, `up` returns non-zero and the old backend has already stopped.
compose docker-compose.prod.yml up -d --remove-orphans

# 6. Health check through the published loopback ports.
backend_port="$(env_value PORT)"
frontend_port="$(env_value FRONTEND_HOST_PORT)"
deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
until curl -fsS "http://127.0.0.1:${backend_port:-3000}/health/db" > /dev/null 2>&1 \
    && curl -fsS "http://127.0.0.1:${frontend_port:-8081}/config.js" > /dev/null 2>&1; do
    if (( SECONDS >= deadline )); then
        echo "deploy: health check timed out after ${HEALTH_TIMEOUT_SECONDS}s" >&2
        false
    fi
    sleep 3
done
trap - ERR
echo "deploy: healthy"

# 7. Housekeeping: keep the last N backups of each kind, drop dangling images.
for kind in appdb drawings; do
    ls -1t backups/"$kind"-* 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f --
done
docker image prune -f > /dev/null

echo "deploy: $VERSION is live (previous: ${PREVIOUS:-<none>})"