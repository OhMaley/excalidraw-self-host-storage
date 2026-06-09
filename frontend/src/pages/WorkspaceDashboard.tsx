import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ScrollArea, Separator } from "radix-ui";

// Hooks
import { useWorkspaceDashboard } from "@hooks/useWorkspaceDashboard";

// Components
import { DeleteDrawingDialog } from "@components/DeleteDrawingDialog";
import { WorkspaceDrawingSection } from "@components/WorkspaceDrawingSection";
import PlusIcon from "../assets/icons/plus.svg?react";

// Services
import { type Drawing } from "@services/drawings";

// Styles
import styles from "./WorkspaceDashboard.module.scss";

export default function WorkspaceDashboard() {
    const { wsId } = useParams<{ wsId: string }>();
    const navigate = useNavigate();
    const { recentlyVisited, recentlyModified, visitedAtMap, loading, handleDelete } =
        useWorkspaceDashboard(wsId);

    const [deleteTarget, setDeleteTarget] = useState<Drawing | null>(null);

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Dashboard</h2>
                <button
                    type="button"
                    className={`btn-md ${styles.startButton}`}
                    onClick={() => void navigate("/draw")}
                >
                    <PlusIcon className={styles.startButtonIcon} />
                    Start drawing
                </button>
            </div>

            <Separator.Root className={styles.separator} />

            <ScrollArea.Root className={styles.scrollRoot}>
                <ScrollArea.Viewport className={styles.scrollViewport}>
                    <WorkspaceDrawingSection
                        title="Recently visited by you"
                        drawings={recentlyVisited}
                        loading={loading}
                        visitedAtMap={visitedAtMap}
                        onDelete={(d) => {
                            setTimeout(() => setDeleteTarget(d), 0);
                        }}
                    />

                    <WorkspaceDrawingSection
                        title="Recently modified"
                        drawings={recentlyModified}
                        loading={loading}
                        onDelete={(d) => {
                            setTimeout(() => setDeleteTarget(d), 0);
                        }}
                    />
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar orientation="vertical" className={styles.scrollbar}>
                    <ScrollArea.Thumb className={styles.scrollbarThumb} />
                </ScrollArea.Scrollbar>
            </ScrollArea.Root>

            <DeleteDrawingDialog
                drawing={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
