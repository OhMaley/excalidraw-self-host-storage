import { useContext } from "react";

import { WorkspacesContext, type WorkspacesContextValue } from "@contexts/WorkspacesContext";

export function useWorkspaces(): WorkspacesContextValue {
    const ctx = useContext(WorkspacesContext);
    if (!ctx) throw new Error("useWorkspaces must be used within WorkspacesProvider");
    return ctx;
}
