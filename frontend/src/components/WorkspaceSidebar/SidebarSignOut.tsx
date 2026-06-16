import ExitIcon from "@assets/icons/exit.svg?react";
import styles from "./WorkspaceSidebar.module.scss";

interface SidebarSignOutProps {
    readonly onLogout: () => void;
}

export function SidebarSignOut({ onLogout }: SidebarSignOutProps) {
    return (
        <div className={styles.sidebarBottom}>
            <button className={`${styles.navItem} ${styles.signOut}`} onClick={onLogout}>
                <ExitIcon className={styles.navIcon} />
                Sign out
            </button>
        </div>
    );
}
