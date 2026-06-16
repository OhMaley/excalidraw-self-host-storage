// Components
import { Link, Outlet, useParams } from "react-router-dom";
import { Avatar, ScrollArea, Tooltip } from "radix-ui";
import { WorkspaceSidebar } from "@components/WorkspaceSidebar";
import { SidebarSignOut } from "@components/WorkspaceSidebar/SidebarSignOut";
import { VScrollbar } from "@components/VScrollbar";

// Contexts
import { WorkspaceCollectionsProvider } from "@contexts/WorkspaceCollectionsContext";
import { WorkspacesProvider } from "@contexts/WorkspacesContext";

// Hooks
import { useAuth } from "@hooks/useAuth";

// Utils
import { getInitials } from "@utils/stringUtils";

// Styles
import styles from "./AppLayout.module.scss";

export function AppLayout() {
    const { user, logout } = useAuth();
    const { wsId } = useParams<{ wsId?: string }>();
    const initials = user ? getInitials(user.name) : "";

    return (
        <WorkspacesProvider>
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
                            <div className={styles.sidebar}>
                                <ScrollArea.Root className={styles.sidebarScroll}>
                                    <ScrollArea.Viewport className={styles.sidebarViewport}>
                                        <nav className={styles.sidebarNav}>
                                            <WorkspaceSidebar />
                                        </nav>
                                    </ScrollArea.Viewport>
                                    <VScrollbar />
                                </ScrollArea.Root>
                                <SidebarSignOut onLogout={logout} />
                            </div>

                            <main className={styles.content}>
                                <Outlet />
                            </main>
                        </div>
                    </div>
                </Tooltip.Provider>
            </WorkspaceCollectionsProvider>
        </WorkspacesProvider>
    );
}
