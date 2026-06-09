// Components
import { Link, Outlet } from "react-router-dom";
import { Avatar, ScrollArea } from "radix-ui";
import { WorkspaceSidebar } from "@components/WorkspaceSidebar";

// Hooks
import { useAuth } from "@hooks/useAuth";

// Utils
import { getInitialFromFullName } from "@utils/userUtils";

// Styles
import styles from "./AppLayout.module.scss";

export function AppLayout() {
    const { user } = useAuth();
    const initials = user ? getInitialFromFullName(user.name, 2) : "";

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <Link to="/" className={styles.appName}>
                    Excalidraw
                </Link>
                <Avatar.Root className={styles.avatarRoot}>
                    <Avatar.Fallback className={styles.avatarFallback}>{initials}</Avatar.Fallback>
                </Avatar.Root>
            </header>

            <div className={styles.body}>
                <ScrollArea.Root className={styles.sidebar}>
                    <ScrollArea.Viewport className={styles.sidebarViewport}>
                        <nav className={styles.sidebarNav}>
                            <WorkspaceSidebar />
                        </nav>
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar orientation="vertical" className={styles.scrollbar}>
                        <ScrollArea.Thumb className={styles.scrollbarThumb} />
                    </ScrollArea.Scrollbar>
                </ScrollArea.Root>

                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
