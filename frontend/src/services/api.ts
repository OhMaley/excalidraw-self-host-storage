import type Keycloak from "keycloak-js";
import { HttpError, HttpStatus } from "@utils/httpError";

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

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await getToken();
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}

async function sendJson<T>(
    method: string,
    url: string,
    body: unknown,
    errorMessage: string
): Promise<T> {
    const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, errorMessage);
    }
    return (await res.json()) as T;
}

export function postJson<T>(url: string, body: unknown, errorMessage: string): Promise<T> {
    return sendJson<T>("POST", url, body, errorMessage);
}

export function patchJson<T>(url: string, body: unknown, errorMessage: string): Promise<T> {
    return sendJson<T>("PATCH", url, body, errorMessage);
}

export async function getJson<T>(url: string, errorMessage: string): Promise<T> {
    const res = await apiFetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
    });
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, errorMessage);
    }
    return (await res.json()) as T;
}

export async function deleteRequest(url: string, errorMessage: string): Promise<void> {
    const res = await apiFetch(url, { method: "DELETE" });
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, errorMessage);
    }
}

export async function getJsonOrNull<T>(url: string, errorMessage: string): Promise<T | null> {
    const res = await apiFetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
    });
    if (res.status === HttpStatus.NO_CONTENT) return null;
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, errorMessage);
    }
    return (await res.json()) as T;
}

export async function putJson(url: string, body: unknown, errorMessage: string): Promise<void> {
    const res = await apiFetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, errorMessage);
    }
}
