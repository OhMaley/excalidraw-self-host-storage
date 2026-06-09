// Types
import type { Workspace } from "@services/workspaces";

// Utils
import { getInitialFromFullName } from "@utils/userUtils";
import { getColorFromId } from "@utils/colorUtils";

// Styles
import styles from "./WorkspaceCard.module.scss";

interface WorkspaceCardProps {
    readonly workspace: Workspace;
    readonly collectionCount: number;
    readonly onClick?: () => void;
}

export function WorkspaceCard({ workspace, collectionCount, onClick }: WorkspaceCardProps) {
    const initials = getInitialFromFullName(workspace.name, 2);
    const avatarColor = getColorFromId(workspace.id);
    const createdAt = new Date(workspace.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const collectionLabel =
        collectionCount === 1 ? "1 collection" : `${collectionCount} collections`;

    return (
        <button type="button" className={styles.card} onClick={onClick}>
            <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
                {initials}
            </div>
            <div className={styles.content}>
                <div className={styles.nameRow}>
                    <h4 className={styles.name}>{workspace.name}</h4>
                    <span className={styles.collectionCount}>{collectionLabel}</span>
                </div>
                {workspace.description && (
                    <p className={styles.description}>{workspace.description}</p>
                )}
                <span className={styles.meta}>Created {createdAt}</span>
            </div>
        </button>
    );
}
