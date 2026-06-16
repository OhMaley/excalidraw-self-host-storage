import { useState, useEffect, useCallback } from "react";
import { useToast } from "@hooks/useToast";
import { fetchWorkspaceContent } from "@services/workspace";
import { type Collection } from "@services/collections";

interface UseWorkspaceTagsAndCollectionsResult {
    readonly collections: Collection[];
    readonly availableTags: string[];
    readonly addTags: (tags: string[]) => void;
}

export function useWorkspaceTagsAndCollections(
    wsId: string | undefined
): UseWorkspaceTagsAndCollectionsResult {
    const { showToast } = useToast();

    const [collections, setCollections] = useState<Collection[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);

    useEffect(() => {
        if (!wsId) return;
        void fetchWorkspaceContent(wsId)
            .then(({ cols, batches }) => {
                setCollections(cols);
                const tagSet = new Set<string>();
                for (const drawing of batches.flat()) {
                    for (const tag of drawing.tags) tagSet.add(tag);
                }
                setAllTags([...tagSet].sort((a, b) => a.localeCompare(b)));
            })
            .catch(() => {
                showToast({ title: "Failed to load workspace data", variant: "error" });
            });
    }, [wsId, showToast]);

    const addTags = useCallback((tags: string[]) => {
        setAllTags((prev) => {
            const merged = new Set(prev);
            let changed = false;
            for (const t of tags) {
                if (!merged.has(t)) {
                    merged.add(t);
                    changed = true;
                }
            }
            return changed ? [...merged].sort((a, b) => a.localeCompare(b)) : prev;
        });
    }, []);

    return { collections, availableTags: allTags, addTags };
}
