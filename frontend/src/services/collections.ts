// Utils
import { HttpError } from "@utils/httpError";

// Services
import { API_BASE, apiFetch, postJson } from "@services/api";

export interface Collection {
    id: string;
    name: string;
    description: string | null;
    workspace_id: string;
    created_at: string;
}

export async function listCollections(workspaceId: string): Promise<Collection[]> {
    const res = await apiFetch(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections`,
        {
            method: "GET",
            headers: { Accept: "application/json" },
        }
    );
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to load collections");
    }
    return (await res.json()) as Collection[];
}

export async function getCollection(
    workspaceId: string,
    collectionId: string
): Promise<Collection> {
    const res = await apiFetch(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}`,
        {
            method: "GET",
            headers: { Accept: "application/json" },
        }
    );
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to load collection");
    }
    return (await res.json()) as Collection;
}

export async function deleteCollection(workspaceId: string, collectionId: string): Promise<void> {
    const res = await apiFetch(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}`,
        { method: "DELETE" }
    );
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to delete collection");
    }
}

export function createCollection(
    workspaceId: string,
    name: string,
    description: string | null
): Promise<Collection> {
    return postJson<Collection>(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections`,
        { name, description },
        "Failed to create collection"
    );
}

export async function updateCollection(
    workspaceId: string,
    collectionId: string,
    name: string,
    description: string | null
): Promise<Collection> {
    const res = await apiFetch(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description }),
        }
    );
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to update collection");
    }
    return (await res.json()) as Collection;
}

export async function getCollectionCount(workspaceId: string): Promise<number> {
    return listCollections(workspaceId).then((c) => c.length);
}
