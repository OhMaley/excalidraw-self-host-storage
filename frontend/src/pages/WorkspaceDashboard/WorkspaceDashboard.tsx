import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ScrollArea, Separator } from "radix-ui";

// Hooks
import { useWorkspaceDashboard } from "@hooks/useWorkspaceDashboard";
import { useWorkspaces } from "@hooks/useWorkspaces";
import { useToast } from "@hooks/useToast";

// Services
import { deleteWorkspace, updateWorkspace } from "@services/workspaces";

// Components
import { WorkspaceDrawingSection } from "./WorkspaceDrawingSection";
import { DeleteConfirmDialog } from "@components/DeleteConfirmDialog";
import { EditWorkspaceDialog } from "@components/EditWorkspaceDialog";
import { WorkspaceMenu } from "@components/WorkspaceMenu";
import { VScrollbar } from "@components/VScrollbar";

// Icons
import PlusIcon from "@assets/icons/plus.svg?react";

// Styles
import styles from "./WorkspaceDashboard.module.scss";

export default function WorkspaceDashboard() {
    const { wsId } = useParams<{ wsId: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { workspaces, replaceWorkspace, removeWorkspace } = useWorkspaces();
    const { recentlyVisited, recentlyModified, visitedAtMap, collectionNameMap, loading } =
        useWorkspaceDashboard(wsId);

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const workspace = workspaces.find((w) => w.id === wsId);

    function handleEditConfirm(name: string, description: string | null): Promise<void> {
        if (!wsId) return Promise.reject(new Error("No workspace"));
        return updateWorkspace(wsId, name, description).then(replaceWorkspace);
    }

    async function handleDeleteConfirm() {
        if (!wsId) return;
        try {
            await deleteWorkspace(wsId);
            removeWorkspace(wsId);
            void navigate("/workspaces");
        } catch {
            showToast({ title: "Failed to delete workspace", variant: "error" });
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Dashboard</h2>
                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={`btn-md ${styles.startButton}`}
                        onClick={() => void navigate("/draw")}
                    >
                        <PlusIcon className={styles.startButtonIcon} />
                        Start drawing
                    </button>
                    {workspace && (
                        <WorkspaceMenu
                            onEdit={() => setEditDialogOpen(true)}
                            onDelete={
                                workspace.is_private ? undefined : () => setDeleteDialogOpen(true)
                            }
                            triggerClassName={styles.menuButton}
                            iconClassName={styles.menuButtonIcon}
                        />
                    )}
                </div>
            </div>

            <Separator.Root className={styles.separator} />

            <ScrollArea.Root className={styles.scrollRoot}>
                <ScrollArea.Viewport className={styles.scrollViewport}>
                    <WorkspaceDrawingSection
                        title="Recently visited by you"
                        drawings={recentlyVisited}
                        loading={loading}
                        readOnly
                        visitedAtMap={visitedAtMap}
                        collectionNameMap={collectionNameMap}
                    />

                    <WorkspaceDrawingSection
                        title="Recently modified"
                        drawings={recentlyModified}
                        loading={loading}
                        readOnly
                        collectionNameMap={collectionNameMap}
                    />
                </ScrollArea.Viewport>
                <VScrollbar />
            </ScrollArea.Root>

            <EditWorkspaceDialog
                workspace={editDialogOpen ? (workspace ?? null) : null}
                onClose={() => setEditDialogOpen(false)}
                onConfirm={handleEditConfirm}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                title="Delete workspace"
                description={
                    <>
                        Are you sure you want to delete <strong>{workspace?.name}</strong>? This
                        will permanently delete all its collections and drawings.
                    </>
                }
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={() => void handleDeleteConfirm()}
            />
        </div>
    );
}
