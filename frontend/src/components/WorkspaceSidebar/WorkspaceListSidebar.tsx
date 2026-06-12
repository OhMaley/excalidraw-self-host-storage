import { NavLink } from "react-router-dom";
import { Separator } from "radix-ui";

import { Spinner } from "@components/Spinner";
import { useWorkspaces } from "@contexts/WorkspacesContext";
import { SidebarSignOut } from "./SidebarSignOut";
import type { Workspace } from "@services/workspaces";
import LockIcon from "../../assets/icons/lock.svg?react";
import UsersIcon from "../../assets/icons/users.svg?react";
import styles from "./WorkspaceSidebar.module.scss";

const byName = (a: Workspace, b: Workspace) => a.name.localeCompare(b.name);

function navClass({ isActive }: { isActive: boolean }) {
    return isActive ? `${styles.navItem} ${styles.active}` : styles.navItem;
}

interface WorkspaceListSidebarProps {
    readonly onLogout: () => void;
}

export function WorkspaceListSidebar({ onLogout }: WorkspaceListSidebarProps) {
    const { workspaces, loading } = useWorkspaces();

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

            <SidebarSignOut onLogout={onLogout} />
        </>
    );
}
