import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";

import { listCollections, type Collection } from "@services/collections";

interface WorkspaceCollectionsContextValue {
    readonly collections: Collection[];
    readonly loading: boolean;
    readonly addCollection: (col: Collection) => void;
    readonly removeCollection: (colId: string) => void;
    readonly updateCollection: (col: Collection) => void;
}

const WorkspaceCollectionsContext = createContext<WorkspaceCollectionsContextValue | null>(null);

interface WorkspaceCollectionsProviderProps {
    readonly wsId: string | undefined;
    readonly children: ReactNode;
}

export function WorkspaceCollectionsProvider({
    wsId,
    children,
}: WorkspaceCollectionsProviderProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loadedWsId, setLoadedWsId] = useState<string | null>(null);

    const loading = !!wsId && loadedWsId !== wsId;

    useEffect(() => {
        if (!wsId) return;
        void listCollections(wsId)
            .then((cols) => {
                setCollections(cols);
                setLoadedWsId(wsId);
            })
            .catch(() => setLoadedWsId(wsId));
    }, [wsId]);

    const addCollection = useCallback((col: Collection) => {
        setCollections((prev) => [...prev, col]);
    }, []);

    const removeCollection = useCallback((colId: string) => {
        setCollections((prev) => prev.filter((c) => c.id !== colId));
    }, []);

    const updateCollection = useCallback((col: Collection) => {
        setCollections((prev) => prev.map((c) => (c.id === col.id ? col : c)));
    }, []);

    return (
        <WorkspaceCollectionsContext.Provider
            value={{ collections, loading, addCollection, removeCollection, updateCollection }}
        >
            {children}
        </WorkspaceCollectionsContext.Provider>
    );
}

export function useWorkspaceCollections(): WorkspaceCollectionsContextValue {
    const ctx = useContext(WorkspaceCollectionsContext);
    if (!ctx)
        throw new Error("useWorkspaceCollections must be used within WorkspaceCollectionsProvider");
    return ctx;
}
