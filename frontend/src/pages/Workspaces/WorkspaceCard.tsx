import { Avatar } from "radix-ui";

// Types
import type { Workspace } from "@services/workspaces";

// Utils
import { getInitials } from "@utils/stringUtils";
import { getColorFromId } from "@utils/colorUtils";

// Components
import { WorkspaceMenu } from "@components/WorkspaceMenu";

// Styles
import styles from "./WorkspaceCard.module.scss";

interface WorkspaceCardProps {
    readonly workspace: Workspace;
    readonly collectionCount: number;
    readonly onClick?: () => void;
    readonly onEdit?: () => void;
    readonly onDelete?: () => void;
}

export function WorkspaceCard({
    workspace,
    collectionCount,
    onClick,
    onEdit,
    onDelete,
}: WorkspaceCardProps) {
    const initials = getInitials(workspace.name);
    const avatarColor = getColorFromId(workspace.id);
    const createdAt = new Date(workspace.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const collectionLabel =
        collectionCount === 1 ? "1 collection" : `${collectionCount} collections`;

    return (
        <div className={styles.wrapper}>
            <button type="button" className={styles.card} onClick={onClick}>
                <Avatar.Root className={styles.avatar} style={{ backgroundColor: avatarColor }}>
                    <Avatar.Fallback>{initials}</Avatar.Fallback>
                </Avatar.Root>
                <div className={styles.content}>
                    <h4 className={styles.name}>{workspace.name}</h4>
                    {workspace.description && (
                        <p className={styles.description}>{workspace.description}</p>
                    )}
                    <div className={styles.bottomRow}>
                        <span className={styles.collectionCount}>{collectionLabel}</span>
                        <span className={styles.meta}>Created {createdAt}</span>
                    </div>
                </div>
            </button>
            {onEdit && (
                <WorkspaceMenu
                    onEdit={onEdit}
                    onDelete={workspace.is_private ? undefined : onDelete}
                    triggerClassName={styles.menuButton}
                    iconClassName={styles.menuButtonIcon}
                />
            )}
        </div>
    );
}
