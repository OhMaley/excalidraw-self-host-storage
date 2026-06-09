const STORAGE_KEY = "excalidraw_visited";
const MAX_VISITS = 50;

interface VisitRecord {
    id: string;
    ts: number;
}

function readRecords(): VisitRecord[] {
    try {
        const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        return Array.isArray(raw) ? (raw as VisitRecord[]) : [];
    } catch {
        return [];
    }
}

export function recordVisit(drawingId: string): void {
    const next: VisitRecord[] = [
        { id: drawingId, ts: Date.now() },
        ...readRecords().filter((r) => r.id !== drawingId),
    ].slice(0, MAX_VISITS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Returns visit records ordered from most to least recently visited.  */
export function getVisitedRecords(since?: number): VisitRecord[] {
    const records = readRecords();
    return since !== undefined ? records.filter((r) => r.ts >= since) : records;
}
