import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";

import { listWorkspaces, type Workspace } from "@services/workspaces";

interface WorkspacesContextValue {
    readonly workspaces: Workspace[];
    readonly loading: boolean;
    readonly addWorkspace: (ws: Workspace) => void;
    readonly removeWorkspace: (id: string) => void;
}

const WorkspacesContext = createContext<WorkspacesContextValue | null>(null);

interface WorkspacesProviderProps {
    readonly children: ReactNode;
}

export function WorkspacesProvider({ children }: WorkspacesProviderProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void listWorkspaces()
            .then(setWorkspaces)
            .finally(() => setLoading(false));
    }, []);

    const addWorkspace = useCallback((ws: Workspace) => {
        setWorkspaces((prev) => [...prev, ws]);
    }, []);

    const removeWorkspace = useCallback((id: string) => {
        setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
    }, []);

    return (
        <WorkspacesContext.Provider value={{ workspaces, loading, addWorkspace, removeWorkspace }}>
            {children}
        </WorkspacesContext.Provider>
    );
}

export function useWorkspaces(): WorkspacesContextValue {
    const ctx = useContext(WorkspacesContext);
    if (!ctx) throw new Error("useWorkspaces must be used within WorkspacesProvider");
    return ctx;
}
