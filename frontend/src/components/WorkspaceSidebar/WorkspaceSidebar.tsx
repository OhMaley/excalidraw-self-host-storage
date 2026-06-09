import { useParams } from "react-router-dom";
import { useAuth } from "@hooks/useAuth";
import { WorkspaceInnerSidebar } from "./WorkspaceInnerSidebar";
import { WorkspaceListSidebar } from "./WorkspaceListSidebar";

export function WorkspaceSidebar() {
    const { wsId } = useParams<{ wsId?: string }>();
    const { logout } = useAuth();

    return wsId ? (
        <WorkspaceInnerSidebar wsId={wsId} onLogout={logout} />
    ) : (
        <WorkspaceListSidebar onLogout={logout} />
    );
}
