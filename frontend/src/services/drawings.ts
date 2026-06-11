// Services
import { API_BASE, apiFetch } from "@services/api";

// Utils
import { HttpError } from "@utils/httpError";

interface DrawingAuthor {
    id: string;
    name: string;
}

export interface Drawing {
    id: string;
    collection_id: string;
    title: string;
    description: string | null;
    tags: string[];
    created_by: DrawingAuthor;
    created_at: string;
    updated_by: DrawingAuthor | null;
    updated_at: string | null;
}

export interface DrawingUpdate {
    title?: string;
    description?: string | null;
    tags?: string[];
    collection_id?: string;
}

export async function updateDrawing(
    workspaceId: string,
    collectionId: string,
    drawingId: string,
    updates: DrawingUpdate
): Promise<Drawing> {
    const res = await apiFetch(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}/drawings/${encodeURIComponent(drawingId)}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        }
    );
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to update drawing");
    }
    return (await res.json()) as Drawing;
}

export async function deleteDrawing(
    workspaceId: string,
    collectionId: string,
    drawingId: string
): Promise<void> {
    const res = await apiFetch(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}/drawings/${encodeURIComponent(drawingId)}`,
        { method: "DELETE" }
    );
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to delete drawing");
    }
}

export async function listDrawings(workspaceId: string, collectionId: string): Promise<Drawing[]> {
    const res = await apiFetch(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}/drawings`,
        { method: "GET", headers: { Accept: "application/json" } }
    );
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to load drawings");
    }
    return (await res.json()) as Drawing[];
}
