import { listCollections, type Collection } from "@services/collections";
import { listDrawings, type Drawing } from "@services/drawings";

export type { Collection, Drawing };

export async function fetchWorkspaceContent(
    wsId: string
): Promise<{ cols: Collection[]; batches: Drawing[][] }> {
    const cols = await listCollections(wsId);
    const batches = await Promise.all(cols.map((c) => listDrawings(wsId, c.id)));
    return { cols, batches };
}
