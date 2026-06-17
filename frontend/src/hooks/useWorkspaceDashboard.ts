import { useState, useEffect } from "react";
import { useAuth } from "@hooks/useAuth";
import { useToast } from "@hooks/useToast";
import { fetchWorkspaceContent } from "@services/workspace";
import { deleteDrawing, type Drawing } from "@services/drawings";
import { getVisitedRecords } from "@utils/visitedDrawings";
import { daysToMs } from "@utils/timeUtils";
import { getColorFromId } from "@utils/colorUtils";

const RECENT_DAYS = 30;
const RECENT_CUTOFF_MS = daysToMs(RECENT_DAYS);

function sortKey(d: Drawing): number {
    return new Date(d.updated_at ?? d.created_at).getTime();
}

function removeById(drawings: Drawing[], id: string): Drawing[] {
    return drawings.filter((d) => d.id !== id);
}

interface UseWorkspaceDashboardResult {
    readonly recentlyVisited: Drawing[];
    readonly recentlyModified: Drawing[];
    readonly visitedAtMap: Map<string, number>;
    readonly collectionNameMap: Map<string, { name: string; color: string }>;
    readonly loading: boolean;
    readonly handleDelete: (drawing: Drawing) => void;
}

export function useWorkspaceDashboard(wsId: string | undefined): UseWorkspaceDashboardResult {
    const { showToast } = useToast();
    const { user } = useAuth();

    const [recentlyVisited, setRecentlyVisited] = useState<Drawing[]>([]);
    const [visitedAtMap, setVisitedAtMap] = useState<Map<string, number>>(new Map());
    const [collectionNameMap, setCollectionNameMap] = useState<
        Map<string, { name: string; color: string }>
    >(new Map());
    const [recentlyModified, setRecentlyModified] = useState<Drawing[]>([]);
    const [loadedWsId, setLoadedWsId] = useState<string | undefined>(undefined);

    const loading = loadedWsId !== wsId;

    useEffect(() => {
        if (!wsId || !user) return;
        void fetchWorkspaceContent(wsId)
            .then(({ cols, batches }) => {
                const now = Date.now();
                const cutoff = now - RECENT_CUTOFF_MS;
                const all = batches.flat().sort((a, b) => sortKey(b) - sortKey(a));

                const colById = new Map(
                    cols.map((c) => [c.id, { name: c.name, color: getColorFromId(c.id) }])
                );
                setCollectionNameMap(
                    new Map(
                        all.map((d) => [
                            d.id,
                            colById.get(d.collection_id) ?? { name: "", color: "" },
                        ])
                    )
                );

                setRecentlyModified(
                    all.filter((d) => new Date(d.updated_at ?? d.created_at).getTime() >= cutoff)
                );

                const visitedRecords = getVisitedRecords(user.id, cutoff);
                const visitRank = new Map(visitedRecords.map((r, i) => [r.id, i]));
                const newVisitedAtMap = new Map(visitedRecords.map((r) => [r.id, r.ts]));
                setVisitedAtMap(newVisitedAtMap);
                setRecentlyVisited(
                    all
                        .filter((d) => visitRank.has(d.id))
                        .sort(
                            (a, b) =>
                                (visitRank.get(a.id) ?? Infinity) -
                                (visitRank.get(b.id) ?? Infinity)
                        )
                );
                setLoadedWsId(wsId);
            })
            .catch(() => {
                showToast({ title: "Failed to load drawings", variant: "error" });
                setLoadedWsId(wsId);
            });
    }, [wsId, user, showToast]);

    function handleDelete(drawing: Drawing): void {
        if (!wsId) return;
        void deleteDrawing(wsId, drawing.collection_id, drawing.id)
            .then(() => {
                setRecentlyModified((prev) => removeById(prev, drawing.id));
                setRecentlyVisited((prev) => removeById(prev, drawing.id));
                setVisitedAtMap((prev) => {
                    const next = new Map(prev);
                    next.delete(drawing.id);
                    return next;
                });
            })
            .catch(() => {
                showToast({ title: "Failed to delete drawing", variant: "error" });
            });
    }

    return {
        recentlyVisited,
        recentlyModified,
        visitedAtMap,
        collectionNameMap,
        loading,
        handleDelete,
    };
}
