import type Keycloak from "keycloak-js";

export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

const TOKEN_MIN_VALIDITY_SECONDS = 30;

let _keycloak: Keycloak | null = null;

export function setKeycloak(kc: Keycloak) {
    _keycloak = kc;
}

async function getToken(): Promise<string | undefined> {
    if (!_keycloak?.authenticated) return undefined;
    if (_keycloak.isTokenExpired(TOKEN_MIN_VALIDITY_SECONDS)) {
        await _keycloak.updateToken(TOKEN_MIN_VALIDITY_SECONDS);
    }
    return _keycloak.token;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await getToken();
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}
