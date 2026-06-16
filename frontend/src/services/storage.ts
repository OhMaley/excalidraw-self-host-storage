// Types
import type { SceneData, AppState } from "@excalidraw/excalidraw/types";

// Services
import { API_BASE, getJson, postJson } from "@services/api";

export interface StoredDrawing {
    id?: string;
    elements?: SceneData["elements"];
    appState?: Partial<AppState>;
    collaborators?: SceneData["collaborators"];
    captureUpdate?: SceneData["captureUpdate"];
}

export function loadDrawing(id: string): Promise<StoredDrawing> {
    return getJson<StoredDrawing>(
        `${API_BASE}/drawings/${encodeURIComponent(id)}`,
        "Failed to load drawing"
    );
}

export function saveDrawing(body: StoredDrawing): Promise<{ id: string }> {
    return postJson<{ id: string }>(`${API_BASE}/drawings`, body, "Failed to save drawing");
}
