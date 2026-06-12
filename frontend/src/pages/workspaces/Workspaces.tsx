import { useState, useEffect } from "react";
import { Separator } from "radix-ui";

import { WorkspacesBody } from "./WorkspacesBody";
import { NewWorkspaceDialog } from "@components/NewWorkspaceDialog";
import { useToast } from "@hooks/useToast";
import { useWorkspaces } from "@contexts/WorkspacesContext";
import type { Workspace } from "@services/workspaces";
import { getCollectionCount } from "@services/collections";
import PlusIcon from "../../assets/icons/plus.svg?react";
import styles from "./Workspaces.module.scss";

function toCountEntry(workspaceId: string): Promise<[string, number]> {
    return getCollectionCount(workspaceId).then((count): [string, number] => [workspaceId, count]);
}

export default function Workspaces() {
    const { showToast } = useToast();
    const { workspaces, loading, addWorkspace } = useWorkspaces();
    const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
    const [dialogOpen, setDialogOpen] = useState(false);

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
            <WorkspacesBody
                loading={loading}
                privateWorkspaces={privateWorkspaces}
                teamWorkspaces={teamWorkspaces}
                collectionCounts={collectionCounts}
            />
            <NewWorkspaceDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onCreated={handleWorkspaceCreated}
            />
        </div>
    );
}
