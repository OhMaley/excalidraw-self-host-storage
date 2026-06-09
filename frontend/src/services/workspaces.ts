// Utils
import { HttpError } from "@utils/httpError";

// Services
import { API_BASE, apiFetch } from "@services/api";

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

export async function createWorkspace(
    name: string,
    description: string | null
): Promise<Workspace> {
    const res = await apiFetch(`${API_BASE}/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
        throw new HttpError(res.status, res.statusText, "Failed to create workspace");
    }
    return (await res.json()) as Workspace;
}
