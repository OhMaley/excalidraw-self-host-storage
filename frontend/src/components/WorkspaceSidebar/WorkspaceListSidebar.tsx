import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Separator } from "radix-ui";

import { Spinner } from "@components/Spinner";
import { listWorkspaces, type Workspace } from "@services/workspaces";
import LockIcon from "../../assets/icons/lock.svg?react";
import UsersIcon from "../../assets/icons/users.svg?react";
import ExitIcon from "../../assets/icons/exit.svg?react";
import styles from "./WorkspaceSidebar.module.scss";

const byName = (a: Workspace, b: Workspace) => a.name.localeCompare(b.name);

function navClass({ isActive }: { isActive: boolean }) {
    return isActive ? `${styles.navItem} ${styles.active}` : styles.navItem;
}

interface WorkspaceListSidebarProps {
    readonly onLogout: () => void;
}

export function WorkspaceListSidebar({ onLogout }: WorkspaceListSidebarProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void listWorkspaces()
            .then(setWorkspaces)
            .finally(() => setLoading(false));
    }, []);

    const privateWorkspaces = workspaces.filter((w) => w.is_private).sort(byName);
    const teamWorkspaces = workspaces.filter((w) => !w.is_private).sort(byName);

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
                        {privateWorkspaces.map((w) => (
                            <NavLink key={w.id} to={`/workspaces/${w.id}`} className={navClass}>
                                <LockIcon className={styles.navIcon} />
                                <span className={styles.navLabel}>{w.name}</span>
                            </NavLink>
                        ))}
                        {privateWorkspaces.length > 0 && teamWorkspaces.length > 0 && (
                            <Separator.Root className={styles.separator} />
                        )}
                        {teamWorkspaces.map((w) => (
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
