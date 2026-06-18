import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ScrollArea, Separator } from "radix-ui";

// Hooks
import { useWorkspaceDashboard } from "@hooks/useWorkspaceDashboard";
import { useWorkspaces } from "@hooks/useWorkspaces";
import { useWorkspaceCollections } from "@hooks/useWorkspaceCollections";
import { useToast } from "@hooks/useToast";

// Services
import { deleteWorkspace, updateWorkspace } from "@services/workspaces";
import { createDrawing } from "@services/drawings";

// Components
import { WorkspaceDrawingSection } from "./WorkspaceDrawingSection";
import { NewDrawingDialog } from "./NewDrawingDialog";
import { DeleteWorkspaceDialog } from "@components/DeleteWorkspaceDialog";
import { EditWorkspaceDialog } from "@components/EditWorkspaceDialog";
import { WorkspaceMenu } from "@components/WorkspaceMenu";
import { VScrollbar } from "@components/VScrollbar";

// Icons
import PlusIcon from "@assets/icons/plus.svg?react";

// Styles
import styles from "./WorkspaceDashboard.module.scss";

function NewDrawingButton({ wsId }: { readonly wsId: string }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { collections } = useWorkspaceCollections();
    const [open, setOpen] = useState(false);

    function handleStartDrawing() {
        if (collections.length === 0) {
            showToast({
                title: "Create a collection first before starting a drawing",
                variant: "error",
            });
            return;
        }
        if (collections.length === 1) {
            void handleCreateDrawing(collections[0].id);
            return;
        }
        setOpen(true);
    }

    async function handleCreateDrawing(colId: string) {
        const drawing = await createDrawing(wsId, colId, { title: "Untitled" });
        void navigate(`/workspaces/${wsId}/collections/${colId}/drawings/${drawing.id}`);
    }

    return (
        <>
            <button
                type="button"
                className={`btn-md ${styles.startButton}`}
                onClick={handleStartDrawing}
            >
                <PlusIcon className={styles.startButtonIcon} />
                Start drawing
            </button>
            <NewDrawingDialog
                open={open}
                onOpenChange={setOpen}
                collections={collections}
                onConfirm={handleCreateDrawing}
            />
        </>
    );
}

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
                    {wsId && <NewDrawingButton wsId={wsId} />}
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
                        wsId={wsId!}
                        title="Recently visited by you"
                        drawings={recentlyVisited}
                        loading={loading}
                        readOnly
                        visitedAtMap={visitedAtMap}
                        collectionNameMap={collectionNameMap}
                    />
                    <WorkspaceDrawingSection
                        wsId={wsId!}
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
            <DeleteWorkspaceDialog
                workspace={deleteDialogOpen ? (workspace ?? null) : null}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={() => void handleDeleteConfirm()}
            />
        </div>
    );
}
