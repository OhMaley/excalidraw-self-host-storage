// Services
import { API_BASE, deleteRequest, getJson, patchJson, postJson } from "@services/api";

interface WorkspaceUser {
    id: string;
    name: string;
}

export interface Workspace {
    id: string;
    name: string;
    description: string | null;
    is_private: boolean;
    created_by: WorkspaceUser;
    created_at: string;
    updated_by: WorkspaceUser | null;
    updated_at: string | null;
}

export function listWorkspaces(): Promise<Workspace[]> {
    return getJson<Workspace[]>(`${API_BASE}/workspaces`, "Failed to load workspaces");
}

export function getWorkspace(id: string): Promise<Workspace> {
    return getJson<Workspace>(
        `${API_BASE}/workspaces/${encodeURIComponent(id)}`,
        "Failed to load workspace"
    );
}

export function createWorkspace(name: string, description: string | null): Promise<Workspace> {
    return postJson<Workspace>(
        `${API_BASE}/workspaces`,
        { name, description },
        "Failed to create workspace"
    );
}

export function updateWorkspace(
    id: string,
    name: string,
    description: string | null
): Promise<Workspace> {
    return patchJson<Workspace>(
        `${API_BASE}/workspaces/${encodeURIComponent(id)}`,
        { name, description },
        "Failed to update workspace"
    );
}

export function deleteWorkspace(id: string): Promise<void> {
    return deleteRequest(
        `${API_BASE}/workspaces/${encodeURIComponent(id)}`,
        "Failed to delete workspace"
    );
}
