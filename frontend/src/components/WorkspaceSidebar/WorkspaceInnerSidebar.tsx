import { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";

import { Spinner } from "@components/Spinner";
import { getWorkspace, type Workspace } from "@services/workspaces";
import { listCollections, type Collection } from "@services/collections";
import { getInitialFromFullName } from "@utils/userUtils";
import { getColorFromId } from "@utils/colorUtils";
import FolderIcon from "../../assets/icons/folder.svg?react";
import GearIcon from "../../assets/icons/gear.svg?react";
import PlusIcon from "../../assets/icons/plus.svg?react";
import UsersIcon from "../../assets/icons/users.svg?react";
import ExitIcon from "../../assets/icons/exit.svg?react";
import styles from "./WorkspaceSidebar.module.scss";

function navClass({ isActive }: { isActive: boolean }) {
    return isActive ? `${styles.navItem} ${styles.active}` : styles.navItem;
}

interface WorkspaceInnerSidebarProps {
    readonly wsId: string;
    readonly onLogout: () => void;
}

export function WorkspaceInnerSidebar({ wsId, onLogout }: WorkspaceInnerSidebarProps) {
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loadedWsId, setLoadedWsId] = useState<string | null>(null);

    const loading = loadedWsId !== wsId;

    useEffect(() => {
        void Promise.all([getWorkspace(wsId), listCollections(wsId)])
            .then(([ws, cols]) => {
                setWorkspace(ws);
                setCollections(cols);
                setLoadedWsId(wsId);
            })
            .catch(() => setLoadedWsId(wsId));
    }, [wsId]);

    const avatarColor = workspace ? getColorFromId(workspace.id) : undefined;
    const initials = workspace ? getInitialFromFullName(workspace.name, 2) : "";

    function renderCollections() {
        if (loading) return <Spinner size="1rem" />;
        if (collections.length === 0)
            return <span className={styles.emptyHint}>No collections yet</span>;
        return (
            <>
                {collections.map((col) => (
                    <NavLink
                        key={col.id}
                        to={`/workspaces/${wsId}/collections/${col.id}`}
                        className={navClass}
                    >
                        <span
                            className={styles.collectionDot}
                            style={{ backgroundColor: getColorFromId(col.id) }}
                        />
                        <span className={styles.navLabel}>{col.name}</span>
                    </NavLink>
                ))}
            </>
        );
    }

    return (
        <>
            <Link to="/workspaces" className={styles.backLink}>
                ← All workspaces
            </Link>

            {workspace && (
                <div className={styles.workspaceHeader}>
                    <div
                        className={styles.workspaceAvatar}
                        style={{ backgroundColor: avatarColor }}
                    >
                        {initials}
                    </div>
                    <span className={styles.workspaceName}>{workspace.name}</span>
                </div>
            )}

            <div className={styles.section}>
                <NavLink to={`/workspaces/${wsId}`} end className={navClass}>
                    <FolderIcon className={styles.navIcon} />
                    <span className={styles.navLabel}>Dashboard</span>
                </NavLink>
                <button className={styles.navItem} aria-disabled="true">
                    <GearIcon className={styles.navIcon} />
                    <span className={styles.navLabel}>Workspace Settings</span>
                </button>
                {workspace && !workspace.is_private && (
                    <button className={styles.navItem} aria-disabled="true">
                        <UsersIcon className={styles.navIcon} />
                        <span className={styles.navLabel}>Team Members</span>
                    </button>
                )}
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Collections</span>
                    <button className={styles.iconButton}>
                        <PlusIcon className={styles.iconButtonIcon} />
                    </button>
                </div>
                {renderCollections()}
            </div>

            <div className={styles.sidebarBottom}>
                <button className={`${styles.navItem} ${styles.signOut}`} onClick={onLogout}>
                    <ExitIcon className={styles.navIcon} />
                    Sign out
                </button>
            </div>
        </>
    );
}
