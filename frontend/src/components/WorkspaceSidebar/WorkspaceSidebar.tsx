import { useParams } from "react-router-dom";
import { WorkspaceInnerSidebar } from "./WorkspaceInnerSidebar";
import { WorkspaceListSidebar } from "./WorkspaceListSidebar";

export function WorkspaceSidebar() {
    const { wsId } = useParams<{ wsId?: string }>();

    return wsId ? <WorkspaceInnerSidebar wsId={wsId} /> : <WorkspaceListSidebar />;
}
