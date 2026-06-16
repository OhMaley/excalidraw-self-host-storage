import { createContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";

import { listWorkspaces, type Workspace } from "@services/workspaces";

export interface WorkspacesContextValue {
    readonly workspaces: Workspace[];
    readonly loading: boolean;
    readonly addWorkspace: (ws: Workspace) => void;
    readonly replaceWorkspace: (ws: Workspace) => void;
    readonly removeWorkspace: (id: string) => void;
}

export const WorkspacesContext = createContext<WorkspacesContextValue | null>(null);

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

    const replaceWorkspace = useCallback((ws: Workspace) => {
        setWorkspaces((prev) => prev.map((w) => (w.id === ws.id ? ws : w)));
    }, []);

    const removeWorkspace = useCallback((id: string) => {
        setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
    }, []);

    return (
        <WorkspacesContext.Provider
            value={{ workspaces, loading, addWorkspace, replaceWorkspace, removeWorkspace }}
        >
            {children}
        </WorkspacesContext.Provider>
    );
}
