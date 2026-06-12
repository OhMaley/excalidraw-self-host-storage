import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";

import { Spinner } from "@components/Spinner";
import { NewCollectionDialog } from "@components/NewCollectionDialog";
import { SidebarSignOut } from "./SidebarSignOut";
import { getWorkspace, type Workspace } from "@services/workspaces";
import { type Collection } from "@services/collections";
import { useWorkspaceCollections } from "@contexts/WorkspaceCollectionsContext";
import { useToast } from "@hooks/useToast";
import { getInitials } from "@utils/stringUtils";
import { getColorFromId } from "@utils/colorUtils";
import FolderIcon from "../../assets/icons/folder.svg?react";
import GearIcon from "../../assets/icons/gear.svg?react";
import PlusIcon from "../../assets/icons/plus.svg?react";
import UsersIcon from "../../assets/icons/users.svg?react";
import styles from "./WorkspaceSidebar.module.scss";

function navClass({ isActive }: { isActive: boolean }) {
    return isActive ? `${styles.navItem} ${styles.active}` : styles.navItem;
}

function WorkspaceHeader({ workspace }: { readonly workspace: Workspace | null }) {
    if (!workspace) return null;
    const avatarColor = getColorFromId(workspace.id);
    const initials = getInitials(workspace.name);
    return (
        <div className={styles.workspaceHeader}>
            <div className={styles.workspaceAvatar} style={{ backgroundColor: avatarColor }}>
                {initials}
            </div>
            <span className={styles.workspaceName}>{workspace.name}</span>
        </div>
    );
}

interface CollectionsListProps {
    readonly loading: boolean;
    readonly collections: Collection[];
    readonly wsId: string;
    readonly onNew: () => void;
}

function CollectionsList({ loading, collections, wsId, onNew }: CollectionsListProps) {
    if (loading) return <Spinner size="1rem" />;
    if (collections.length === 0)
        return (
            <button className={styles.emptyHint} onClick={onNew}>
                + New collection
            </button>
        );
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

interface WorkspaceInnerSidebarProps {
    readonly wsId: string;
    readonly onLogout: () => void;
}

export function WorkspaceInnerSidebar({ wsId, onLogout }: WorkspaceInnerSidebarProps) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { collections, loading, addCollection } = useWorkspaceCollections();
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        if (!wsId) return;
        void getWorkspace(wsId)
            .then(setWorkspace)
            .catch(() => showToast({ title: "Failed to load workspace", variant: "error" }));
    }, [wsId, showToast]);

    function handleCollectionCreated(col: Collection) {
        addCollection(col);
        void navigate(`/workspaces/${wsId}/collections/${col.id}`);
    }

    return (
        <>
            <Link to="/workspaces" className={styles.backLink}>
                ← All workspaces
            </Link>

            <WorkspaceHeader workspace={workspace} />

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
                    <button
                        className={styles.iconButton}
                        onClick={() => setDialogOpen(true)}
                        title="New collection"
                        aria-label="New collection"
                    >
                        <PlusIcon className={styles.iconButtonIcon} />
                    </button>
                </div>
                <CollectionsList
                    loading={loading}
                    collections={collections}
                    wsId={wsId}
                    onNew={() => setDialogOpen(true)}
                />
            </div>

            <SidebarSignOut onLogout={onLogout} />

            <NewCollectionDialog
                wsId={wsId}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onCreated={handleCollectionCreated}
            />
        </>
    );
}
