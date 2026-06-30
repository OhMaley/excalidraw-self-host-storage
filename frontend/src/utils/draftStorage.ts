import type {
    ExcalidrawProps,
    AppState,
    BinaryFiles,
    LibraryItems,
} from "@excalidraw/excalidraw/types";

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

const LIBRARY_KEY = "excalidraw-library";

export function saveLibrary(items: LibraryItems): void {
    try {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
    } catch {
        // Quota exceeded or storage unavailable
    }
}

export function loadLibrary(): LibraryItems | null {
    try {
        const raw = localStorage.getItem(LIBRARY_KEY);
        return raw ? (JSON.parse(raw) as LibraryItems) : null;
    } catch {
        return null;
    }
}
