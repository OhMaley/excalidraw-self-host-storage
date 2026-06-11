import { useState, useEffect } from "react";
import { useToast } from "@hooks/useToast";
import { getCollection, type Collection } from "@services/collections";
import {
    deleteDrawing,
    listDrawings,
    updateDrawing,
    type Drawing,
    type DrawingUpdate,
} from "@services/drawings";

function sortByLastModified(drawings: Drawing[]): Drawing[] {
    return [...drawings].sort(
        (a, b) =>
            new Date(b.updated_at ?? b.created_at).getTime() -
            new Date(a.updated_at ?? a.created_at).getTime()
    );
}

function withoutDrawing(id: string) {
    return (prev: Drawing[]) => prev.filter((d) => d.id !== id);
}

function withUpdatedDrawing(updated: Drawing) {
    return (prev: Drawing[]) =>
        sortByLastModified(prev.map((d) => (d.id === updated.id ? updated : d)));
}

interface UseCollectionViewResult {
    readonly collection: Collection | null;
    readonly drawings: Drawing[];
    readonly loading: boolean;
    readonly handleDelete: (drawing: Drawing) => void;
    readonly handleEdit: (drawing: Drawing, updates: DrawingUpdate) => Promise<void>;
}

export function useCollectionView(
    wsId: string | undefined,
    colId: string | undefined
): UseCollectionViewResult {
    const { showToast } = useToast();

    const [collection, setCollection] = useState<Collection | null>(null);
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [loadedKey, setLoadedKey] = useState<string | undefined>(undefined);

    const key = wsId && colId ? `${wsId}/${colId}` : undefined;
    const loading = loadedKey !== key;

    useEffect(() => {
        if (!wsId || !colId) return;
        void Promise.all([getCollection(wsId, colId), listDrawings(wsId, colId)])
            .then(([col, all]) => {
                setCollection(col);
                setDrawings(sortByLastModified(all));
                setLoadedKey(`${wsId}/${colId}`);
            })
            .catch(() => {
                showToast({ title: "Failed to load collection", variant: "error" });
                setLoadedKey(`${wsId}/${colId}`);
            });
    }, [wsId, colId, showToast]);

    function handleDelete(drawing: Drawing): void {
        if (!wsId || !colId) return;
        void deleteDrawing(wsId, colId, drawing.id)
            .then(() => {
                setDrawings(withoutDrawing(drawing.id));
            })
            .catch(() => {
                showToast({ title: "Failed to delete drawing", variant: "error" });
            });
    }

    function handleEdit(drawing: Drawing, updates: DrawingUpdate): Promise<void> {
        if (!wsId) return Promise.reject(new Error("No workspace"));
        return updateDrawing(wsId, drawing.collection_id, drawing.id, updates).then((updated) => {
            if (updates.collection_id && updates.collection_id !== colId) {
                setDrawings(withoutDrawing(drawing.id));
            } else {
                setDrawings(withUpdatedDrawing(updated));
            }
        });
    }

    return { collection, drawings, loading, handleDelete, handleEdit };
}
