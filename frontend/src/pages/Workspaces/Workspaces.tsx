import { useState, useEffect } from "react";
import { ScrollArea, Separator } from "radix-ui";

import { WorkspacesBody } from "./WorkspacesBody";
import { VScrollbar } from "@components/VScrollbar";
import { NewWorkspaceDialog } from "./NewWorkspaceDialog";
import { EditWorkspaceDialog } from "@components/EditWorkspaceDialog";
import { DeleteConfirmDialog } from "@components/DeleteConfirmDialog";
import { useToast } from "@hooks/useToast";
import { useWorkspaces } from "@hooks/useWorkspaces";
import type { Workspace } from "@services/workspaces";
import { getCollectionCount } from "@services/collections";
import { deleteWorkspace, updateWorkspace } from "@services/workspaces";
import PlusIcon from "@assets/icons/plus.svg?react";
import styles from "./Workspaces.module.scss";

function toCountEntry(workspaceId: string): Promise<[string, number]> {
    return getCollectionCount(workspaceId).then((count): [string, number] => [workspaceId, count]);
}

export default function Workspaces() {
    const { showToast } = useToast();
    const { workspaces, loading, addWorkspace, replaceWorkspace, removeWorkspace } =
        useWorkspaces();
    const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Workspace | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Workspace | null>(null);

    useEffect(() => {
        if (loading) return;
        Promise.all(workspaces.map((w) => toCountEntry(w.id)))
            .then((entries) => setCollectionCounts(Object.fromEntries(entries)))
            .catch(() =>
                showToast({ title: "Failed to load collection counts", variant: "error" })
            );
    }, [loading, workspaces, showToast]);

    function handleWorkspaceCreated(workspace: Workspace) {
        addWorkspace(workspace);
    }

    function handleEditConfirm(name: string, description: string | null): Promise<void> {
        if (!editTarget) return Promise.reject(new Error("No workspace selected"));
        return updateWorkspace(editTarget.id, name, description).then(replaceWorkspace);
    }

    async function handleDeleteConfirm() {
        if (!pendingDelete) return;
        try {
            await deleteWorkspace(pendingDelete.id);
            removeWorkspace(pendingDelete.id);
            setPendingDelete(null);
        } catch {
            showToast({ title: "Failed to delete workspace", variant: "error" });
        }
    }

    const privateWorkspaces = workspaces.filter((w) => w.is_private);
    const teamWorkspaces = workspaces.filter((w) => !w.is_private);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Workspaces</h2>
                <button
                    className={`btn-md ${styles.headerButton}`}
                    onClick={() => setDialogOpen(true)}
                >
                    <PlusIcon className={styles.icon} />
                    New Workspace
                </button>
            </div>
            <Separator.Root className={styles.separator} />
            <ScrollArea.Root className={styles.scrollRoot}>
                <ScrollArea.Viewport className={styles.scrollViewport}>
                    <WorkspacesBody
                        loading={loading}
                        privateWorkspaces={privateWorkspaces}
                        teamWorkspaces={teamWorkspaces}
                        collectionCounts={collectionCounts}
                        onEdit={setEditTarget}
                        onDelete={setPendingDelete}
                    />
                </ScrollArea.Viewport>
                <VScrollbar />
            </ScrollArea.Root>
            <NewWorkspaceDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onCreated={handleWorkspaceCreated}
            />
            <EditWorkspaceDialog
                workspace={editTarget}
                onClose={() => setEditTarget(null)}
                onConfirm={handleEditConfirm}
            />
            <DeleteConfirmDialog
                open={pendingDelete !== null}
                title="Delete workspace"
                description={
                    <>
                        Are you sure you want to delete <strong>{pendingDelete?.name}</strong>? This
                        will permanently delete all its collections and drawings.
                    </>
                }
                onClose={() => setPendingDelete(null)}
                onConfirm={() => void handleDeleteConfirm()}
            />
        </div>
    );
}
