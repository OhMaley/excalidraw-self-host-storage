// Services
import { API_BASE, deleteRequest, getJson, patchJson } from "@services/api";

export type WorkspaceRole = "owner" | "admin" | "member";

interface MemberUser {
    id: string;
    name: string;
}

export interface WorkspaceMember {
    user: MemberUser;
    role: WorkspaceRole;
    joined_at: string;
}

export function listMembers(wsId: string): Promise<WorkspaceMember[]> {
    return getJson<WorkspaceMember[]>(
        `${API_BASE}/workspaces/${encodeURIComponent(wsId)}/members`,
        "Failed to load members"
    );
}

export function getMyMembership(wsId: string): Promise<WorkspaceMember> {
    return getJson<WorkspaceMember>(
        `${API_BASE}/workspaces/${encodeURIComponent(wsId)}/members/me`,
        "Failed to load your membership"
    );
}

export function updateMemberRole(
    wsId: string,
    userId: string,
    role: WorkspaceRole
): Promise<WorkspaceMember> {
    return patchJson<WorkspaceMember>(
        `${API_BASE}/workspaces/${encodeURIComponent(wsId)}/members/${encodeURIComponent(userId)}`,
        { role },
        "Failed to update member role"
    );
}

export function removeMember(wsId: string, userId: string): Promise<void> {
    return deleteRequest(
        `${API_BASE}/workspaces/${encodeURIComponent(wsId)}/members/${encodeURIComponent(userId)}`,
        "Failed to remove member"
    );
}

export function leaveWorkspace(wsId: string): Promise<void> {
    return deleteRequest(
        `${API_BASE}/workspaces/${encodeURIComponent(wsId)}/members/me`,
        "Failed to leave workspace"
    );
}
