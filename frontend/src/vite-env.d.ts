/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE?: string;
    readonly VITE_KEYCLOAK_URL: string;
    readonly VITE_KEYCLOAK_REALM: string;
    readonly VITE_KEYCLOAK_CLIENT_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Set by /config.js before the app bundle loads (see src/services/config.ts).
interface Window {
    __APP_CONFIG__?: Partial<import("@services/config").AppConfig>;
}