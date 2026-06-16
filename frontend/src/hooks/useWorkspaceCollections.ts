import { useContext } from "react";

import {
    WorkspaceCollectionsContext,
    type WorkspaceCollectionsContextValue,
} from "@contexts/WorkspaceCollectionsContext";

export function useWorkspaceCollections(): WorkspaceCollectionsContextValue {
    const ctx = useContext(WorkspaceCollectionsContext);
    if (!ctx)
        throw new Error("useWorkspaceCollections must be used within WorkspaceCollectionsProvider");
    return ctx;
}
