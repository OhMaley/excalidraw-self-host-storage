const STORAGE_KEY_PREFIX = "excalidraw_visited_";
const MAX_VISITS = 50;

interface VisitRecord {
    id: string;
    ts: number;
}

function readRecords(userId: string): VisitRecord[] {
    try {
        const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + userId) ?? "[]");
        return Array.isArray(raw) ? (raw as VisitRecord[]) : [];
    } catch {
        return [];
    }
}

export function recordVisit(userId: string, drawingId: string): void {
    const next: VisitRecord[] = [
        { id: drawingId, ts: Date.now() },
        ...readRecords(userId).filter((r) => r.id !== drawingId),
    ].slice(0, MAX_VISITS);
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(next));
}

/** Returns visit records ordered from most to least recently visited.  */
export function getVisitedRecords(userId: string, since?: number): VisitRecord[] {
    const records = readRecords(userId);
    return since !== undefined ? records.filter((r) => r.ts >= since) : records;
}
