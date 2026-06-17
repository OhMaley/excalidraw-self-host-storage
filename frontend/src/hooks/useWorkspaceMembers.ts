import { useEffect, useState } from "react";
import { useToast } from "@hooks/useToast";
import {
    getMyMembership,
    leaveWorkspace,
    listMembers,
    removeMember,
    updateMemberRole,
    type WorkspaceMember,
    type WorkspaceRole,
} from "@services/members";

function withoutMember(userId: string) {
    return (prev: WorkspaceMember[]) => prev.filter((m) => m.user.id !== userId);
}

function withUpdatedMember(updated: WorkspaceMember) {
    return (prev: WorkspaceMember[]) =>
        prev.map((m) => (m.user.id === updated.user.id ? updated : m));
}

interface UseWorkspaceMembersResult {
    readonly members: WorkspaceMember[];
    readonly myRole: WorkspaceRole | null;
    readonly loading: boolean;
    readonly handleRoleChange: (member: WorkspaceMember, role: "admin" | "member") => void;
    readonly handleRemove: (member: WorkspaceMember) => void;
    readonly handleTransferOwnership: (member: WorkspaceMember) => void;
    readonly handleLeave: () => Promise<void>;
}

export function useWorkspaceMembers(wsId: string | undefined): UseWorkspaceMembersResult {
    const { showToast } = useToast();

    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [myRole, setMyRole] = useState<WorkspaceRole | null>(null);
    const [loadedKey, setLoadedKey] = useState<string | undefined>(undefined);

    const loading = loadedKey !== wsId;

    function fetchAll(): void {
        if (!wsId) return;
        void Promise.all([listMembers(wsId), getMyMembership(wsId)])
            .then(([all, me]) => {
                setMembers(all);
                setMyRole(me.role);
                setLoadedKey(wsId);
            })
            .catch(() => {
                showToast({ title: "Failed to load members", variant: "error" });
                setLoadedKey(wsId);
            });
    }

    useEffect(fetchAll, [wsId]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleRoleChange(member: WorkspaceMember, role: "admin" | "member"): void {
        if (!wsId) return;
        void updateMemberRole(wsId, member.user.id, role)
            .then((updated) => setMembers(withUpdatedMember(updated)))
            .catch(() => showToast({ title: "Failed to update role", variant: "error" }));
    }

    function handleRemove(member: WorkspaceMember): void {
        if (!wsId) return;
        void removeMember(wsId, member.user.id)
            .then(() => setMembers(withoutMember(member.user.id)))
            .catch(() => showToast({ title: "Failed to remove member", variant: "error" }));
    }

    function handleTransferOwnership(member: WorkspaceMember): void {
        if (!wsId) return;
        void updateMemberRole(wsId, member.user.id, "owner")
            .then(() => fetchAll())
            .catch(() => showToast({ title: "Failed to transfer ownership", variant: "error" }));
    }

    function handleLeave(): Promise<void> {
        if (!wsId) return Promise.reject(new Error("No workspace"));
        return leaveWorkspace(wsId);
    }

    return {
        members,
        myRole,
        loading,
        handleRoleChange,
        handleRemove,
        handleTransferOwnership,
        handleLeave,
    };
}
