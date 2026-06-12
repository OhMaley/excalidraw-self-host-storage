import { useNavigate, useParams } from "react-router-dom";
import { ScrollArea, Separator } from "radix-ui";

// Hooks
import { useWorkspaceDashboard } from "@hooks/useWorkspaceDashboard";

// Components
import { WorkspaceDrawingSection } from "@components/WorkspaceDrawingSection";
import { VScrollbar } from "@components/VScrollbar";
import PlusIcon from "../assets/icons/plus.svg?react";

// Styles
import styles from "./WorkspaceDashboard.module.scss";

export default function WorkspaceDashboard() {
    const { wsId } = useParams<{ wsId: string }>();
    const navigate = useNavigate();
    const { recentlyVisited, recentlyModified, visitedAtMap, collectionNameMap, loading } =
        useWorkspaceDashboard(wsId);

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
        </div>
    );
}
