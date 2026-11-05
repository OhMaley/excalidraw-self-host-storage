// Runtime configuration.
//
// In the production Docker image, /config.js is generated at container start
// from the container's environment (see docker/40-runtime-config.sh), so one
// image can be deployed anywhere. In local dev and CI builds, public/config.js
// is an empty object and the build-time VITE_* values are used instead.
// A non-empty runtime value always wins over the build-time one.

export interface AppConfig {
    apiBase: string;
    keycloakUrl: string;
    keycloakRealm: string;
    keycloakClientId: string;
}

const runtime: Partial<AppConfig> = window.__APP_CONFIG__ ?? {};

function pick(runtimeValue: string | undefined, buildValue: string | undefined): string {
    if (runtimeValue) return runtimeValue;
    return buildValue ?? "";
}

export const appConfig: AppConfig = {
    apiBase: pick(runtime.apiBase, import.meta.env.VITE_API_BASE),
    keycloakUrl: pick(runtime.keycloakUrl, import.meta.env.VITE_KEYCLOAK_URL),
    keycloakRealm: pick(runtime.keycloakRealm, import.meta.env.VITE_KEYCLOAK_REALM),
    keycloakClientId: pick(runtime.keycloakClientId, import.meta.env.VITE_KEYCLOAK_CLIENT_ID),
};
