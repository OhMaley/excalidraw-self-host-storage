// Utils
import { HttpError } from "@utils/httpError";

// Services
import { API_BASE, apiFetch, postJson } from "@services/api";

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

export async function listWorkspaces(): Promise<Workspace[]> {
    const res = await apiFetch(`${API_BASE}/workspaces`, {
        method: "GET",
        headers: { Accept: "application/json" },
    });
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to load workspaces");
    }
    return (await res.json()) as Workspace[];
}

export async function getWorkspace(id: string): Promise<Workspace> {
    const res = await apiFetch(`${API_BASE}/workspaces/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
    });
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to load workspace");
    }
    return (await res.json()) as Workspace;
}

export function createWorkspace(name: string, description: string | null): Promise<Workspace> {
    return postJson<Workspace>(
        `${API_BASE}/workspaces`,
        { name, description },
        "Failed to create workspace"
    );
}

export async function deleteWorkspace(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/workspaces/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to delete workspace");
    }
}
