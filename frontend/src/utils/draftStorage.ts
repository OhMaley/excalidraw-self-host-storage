import type { ExcalidrawProps, AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

type ExcalidrawElements = Parameters<NonNullable<ExcalidrawProps["onChange"]>>[0];

interface Draft {
    elements: ExcalidrawElements;
    appState: Pick<AppState, "viewBackgroundColor">;
    files: BinaryFiles;
}

function draftKey(drawingId?: string): string {
    return drawingId ? `excalidraw-draft-${drawingId}` : "excalidraw-draft";
}

export function saveDraft(
    drawingId: string | undefined,
    elements: ExcalidrawElements,
    appState: AppState,
    files: BinaryFiles
): void {
    try {
        const draft: Draft = {
            elements,
            appState: { viewBackgroundColor: appState.viewBackgroundColor },
            files,
        };
        localStorage.setItem(draftKey(drawingId), JSON.stringify(draft));
    } catch {
        // Quota exceeded or storage unavailable
    }
}

export function loadDraft(drawingId?: string): Draft | null {
    try {
        const raw = localStorage.getItem(draftKey(drawingId));
        return raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
        return null;
    }
}

export function clearDraft(drawingId?: string): void {
    try {
        localStorage.removeItem(draftKey(drawingId));
    } catch {
        // Ignore
    }
}
