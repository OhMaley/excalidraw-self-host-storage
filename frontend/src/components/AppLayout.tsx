// Components
import { Link, Outlet, useParams } from "react-router-dom";
import { Avatar, ScrollArea, Tooltip } from "radix-ui";
import { WorkspaceSidebar } from "@components/WorkspaceSidebar";

// Contexts
import { WorkspaceCollectionsProvider } from "@contexts/WorkspaceCollectionsContext";

// Hooks
import { useAuth } from "@hooks/useAuth";

// Utils
import { getInitials } from "@utils/stringUtils";

// Styles
import styles from "./AppLayout.module.scss";

export function AppLayout() {
    const { user } = useAuth();
    const { wsId } = useParams<{ wsId?: string }>();
    const initials = user ? getInitials(user.name) : "";

    return (
        <WorkspaceCollectionsProvider wsId={wsId}>
            <Tooltip.Provider delayDuration={500}>
                <div className={styles.root}>
                    <header className={styles.header}>
                        <Link to="/" className={styles.appName}>
                            Excalidraw
                        </Link>
                        <Avatar.Root className={styles.avatarRoot}>
                            <Avatar.Fallback className={styles.avatarFallback}>
                                {initials}
                            </Avatar.Fallback>
                        </Avatar.Root>
                    </header>

                    <div className={styles.body}>
                        <ScrollArea.Root className={styles.sidebar}>
                            <ScrollArea.Viewport className={styles.sidebarViewport}>
                                <nav className={styles.sidebarNav}>
                                    <WorkspaceSidebar />
                                </nav>
                            </ScrollArea.Viewport>
                            <ScrollArea.Scrollbar
                                orientation="vertical"
                                className={styles.scrollbar}
                            >
                                <ScrollArea.Thumb className={styles.scrollbarThumb} />
                            </ScrollArea.Scrollbar>
                        </ScrollArea.Root>

                        <main className={styles.content}>
                            <Outlet />
                        </main>
                    </div>
                </div>
            </Tooltip.Provider>
        </WorkspaceCollectionsProvider>
    );
}
