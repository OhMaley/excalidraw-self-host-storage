// Services
import { API_BASE, deleteRequest, getJson, patchJson, postJson } from "@services/api";

export interface Collection {
    id: string;
    name: string;
    description: string | null;
    workspace_id: string;
    created_at: string;
}

export function listCollections(workspaceId: string): Promise<Collection[]> {
    return getJson<Collection[]>(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections`,
        "Failed to load collections"
    );
}

export function getCollection(workspaceId: string, collectionId: string): Promise<Collection> {
    return getJson<Collection>(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}`,
        "Failed to load collection"
    );
}

export function deleteCollection(workspaceId: string, collectionId: string): Promise<void> {
    return deleteRequest(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}`,
        "Failed to delete collection"
    );
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

export function updateCollection(
    workspaceId: string,
    collectionId: string,
    name: string,
    description: string | null
): Promise<Collection> {
    return patchJson<Collection>(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/collections/${encodeURIComponent(collectionId)}`,
        { name, description },
        "Failed to update collection"
    );
}

export async function getCollectionCount(workspaceId: string): Promise<number> {
    return listCollections(workspaceId).then((c) => c.length);
}
