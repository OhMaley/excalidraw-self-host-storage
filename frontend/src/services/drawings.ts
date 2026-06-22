// Services
import { API_BASE, deleteRequest, getJson, patchJson, postJson } from "@services/api";

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

export interface DrawingCreate {
    title: string;
    description?: string | null;
    tags?: string[];
}

export function updateDrawing(
    workspaceId: string,
    collectionId: string,
    drawingId: string,
    updates: DrawingUpdate
): Promise<Drawing> {
    return patchJson<Drawing>(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}/drawings/${encodeURIComponent(drawingId)}`,
        updates,
        "Failed to update drawing"
    );
}

export function deleteDrawing(
    workspaceId: string,
    collectionId: string,
    drawingId: string
): Promise<void> {
    return deleteRequest(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}/drawings/${encodeURIComponent(drawingId)}`,
        "Failed to delete drawing"
    );
}

export function getDrawing(
    workspaceId: string,
    collectionId: string,
    drawingId: string
): Promise<Drawing> {
    return getJson<Drawing>(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}/drawings/${encodeURIComponent(drawingId)}`,
        "Failed to load drawing"
    );
}

export function listDrawings(workspaceId: string, collectionId: string): Promise<Drawing[]> {
    return getJson<Drawing[]>(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}/drawings`,
        "Failed to load drawings"
    );
}

export function createDrawing(
    workspaceId: string,
    collectionId: string,
    data: DrawingCreate
): Promise<Drawing> {
    return postJson<Drawing>(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}/drawings`,
        data,
        "Failed to create drawing"
    );
}
