// Services
import { API_BASE, deleteRequest, getJson, patchJson, postJson } from "@services/api";

interface CollectionAuthor {
    id: string;
    name: string;
}

export interface Collection {
    id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    created_by: CollectionAuthor;
    created_at: string;
    updated_by: CollectionAuthor | null;
    updated_at: string | null;
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
