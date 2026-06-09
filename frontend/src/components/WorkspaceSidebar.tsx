import { useState, useEffect } from "react";

// Components
import { NavLink, Link, useParams } from "react-router-dom";
import { Separator } from "radix-ui";
import Spinner from "@components/Spinner";

// Hooks
import { useAuth } from "@hooks/useAuth";

// Services
import { listWorkspaces, getWorkspace, type Workspace } from "@services/workspaces";
import { listCollections, type Collection } from "@services/collections";

// Utils
import { getInitialFromFullName } from "@utils/userUtils";
import { getColorFromId } from "@utils/colorUtils";

// Icons
import LockIcon from "../assets/icons/lock.svg?react";
import UsersIcon from "../assets/icons/users.svg?react";
import FolderIcon from "../assets/icons/folder.svg?react";
import GearIcon from "../assets/icons/gear.svg?react";
import PlusIcon from "../assets/icons/plus.svg?react";
import ExitIcon from "../assets/icons/exit.svg?react";

// Styles
import styles from "./WorkspaceSidebar.module.scss";

function navClass({ isActive }: { isActive: boolean }) {
    return isActive ? `${styles.navItem} ${styles.active}` : styles.navItem;
}

const byName = (a: Workspace, b: Workspace) => a.name.localeCompare(b.name);

// ── State A: workspace list ────────────────────────────────

interface WorkspaceListSidebarProps {
    readonly onLogout: () => void;
}

function WorkspaceListSidebar({ onLogout }: WorkspaceListSidebarProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void listWorkspaces()
            .then(setWorkspaces)
            .finally(() => setLoading(false));
    }, []);

    const privateWs = workspaces.filter((w) => w.is_private).sort(byName);
    const teamWs = workspaces.filter((w) => !w.is_private).sort(byName);

    return (
        <>
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>My Workspaces</span>
                </div>
                {loading ? (
                    <Spinner size="1rem" />
                ) : (
                    <>
                        {privateWs.map((w) => (
                            <NavLink key={w.id} to={`/workspaces/${w.id}`} className={navClass}>
                                <LockIcon className={styles.navIcon} />
                                <span className={styles.navLabel}>{w.name}</span>
                            </NavLink>
                        ))}
                        {privateWs.length > 0 && teamWs.length > 0 && (
                            <Separator.Root className={styles.separator} />
                        )}
                        {teamWs.map((w) => (
                            <NavLink key={w.id} to={`/workspaces/${w.id}`} className={navClass}>
                                <UsersIcon className={styles.navIcon} />
                                <span className={styles.navLabel}>{w.name}</span>
                            </NavLink>
                        ))}
                    </>
                )}
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

// ── State B: inside a workspace ────────────────────────────

interface WorkspaceInnerSidebarProps {
    readonly wsId: string;
    readonly onLogout: () => void;
}

function WorkspaceInnerSidebar({ wsId, onLogout }: WorkspaceInnerSidebarProps) {
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

// ── Root: picks state based on route ───────────────────────

export function WorkspaceSidebar() {
    const { wsId } = useParams<{ wsId?: string }>();
    const { logout } = useAuth();

    return wsId ? (
        <WorkspaceInnerSidebar wsId={wsId} onLogout={logout} />
    ) : (
        <WorkspaceListSidebar onLogout={logout} />
    );
}
