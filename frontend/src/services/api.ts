import type Keycloak from "keycloak-js";
import { HttpError } from "@utils/httpError";

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

export async function postJson<T>(url: string, body: unknown, errorMessage: string): Promise<T> {
    const res = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, errorMessage);
    }
    return (await res.json()) as T;
}
