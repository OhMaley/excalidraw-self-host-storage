#!/bin/sh
# Generates /config.js from the container's environment at startup.
# Run automatically by the nginx image's /docker-entrypoint.sh (which uses
# `set -e`), so a non-zero exit here prevents the container from starting.
#
# Only public values belong here — this file is served to every visitor.
set -eu

: "${KEYCLOAK_URL:?KEYCLOAK_URL is required}"
: "${KEYCLOAK_REALM:?KEYCLOAK_REALM is required}"
: "${KEYCLOAK_CLIENT_ID:?KEYCLOAK_CLIENT_ID is required}"
API_BASE="${API_BASE:-}"

case "$KEYCLOAK_URL" in
    https://* | http://*) ;;
    *)
        echo "40-runtime-config: KEYCLOAK_URL must be an absolute http(s) URL" >&2
        exit 1
        ;;
esac

# Escape for a JSON/JS double-quoted string; reject newlines outright.
json_string() {
    case "$1" in
        *"
"*)
            echo "40-runtime-config: config values must not contain newlines" >&2
            exit 1
            ;;
    esac
    printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/</\\u003c/g')"
}

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
    apiBase: $(json_string "$API_BASE"),
    keycloakUrl: $(json_string "$KEYCLOAK_URL"),
    keycloakRealm: $(json_string "$KEYCLOAK_REALM"),
    keycloakClientId: $(json_string "$KEYCLOAK_CLIENT_ID"),
};
EOF

echo "40-runtime-config: wrote /config.js (keycloak=$KEYCLOAK_URL realm=$KEYCLOAK_REALM)"
