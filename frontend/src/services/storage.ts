// Types
import type { SceneData, AppState } from "@excalidraw/excalidraw/types";

// Utils
import { HttpError, HttpStatus } from "@utils/httpError";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

export interface StoredDrawing {
    id?: string;
    elements?: SceneData["elements"];
    appState?: Partial<AppState>;
    collaborators?: SceneData["collaborators"];
    captureUpdate?: SceneData["captureUpdate"];
}

export async function loadDrawing(id: string): Promise<StoredDrawing> {
    try {
        const res = await fetch(`${API_BASE}/drawings/${encodeURIComponent(id)}`, {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "include",
        });
        if (!res.ok) {
            throw new HttpError(res.status, res.statusText, "Failed to load drawing");
        }
        return (await res.json()) as StoredDrawing;
    } catch (error) {
        if (error instanceof HttpError) {
            throw error;
        } else {
            throw new HttpError(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Fetch error",
                "Drawing fetch error"
            );
        }
    }
}

export async function saveDrawing(body: StoredDrawing): Promise<{ id: string }> {
    const res = await fetch(`${API_BASE}/drawings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        throw new Error(`Failed to save drawing: ${res.status}`);
    }

    const data = (await res.json()) as { id: string };
    return data;
}
