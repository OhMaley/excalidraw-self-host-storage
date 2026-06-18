// Types
import type { AppState, BinaryFiles, ExcalidrawProps } from "@excalidraw/excalidraw/types";

// Services
import { API_BASE, getJsonOrNull, putJson } from "@services/api";

type ExcalidrawElements = Parameters<NonNullable<ExcalidrawProps["onChange"]>>[0];

export interface ExcalidrawFile {
    type: "excalidraw";
    version: number;
    source: string;
    elements: ExcalidrawElements;
    appState: Partial<AppState>;
    files: BinaryFiles | null;
}

export function loadDrawingContent(
    wsId: string,
    colId: string,
    drawingId: string
): Promise<ExcalidrawFile | null> {
    return getJsonOrNull<ExcalidrawFile>(
        `${API_BASE}/workspaces/${encodeURIComponent(wsId)}/collections/${encodeURIComponent(colId)}/drawings/${encodeURIComponent(drawingId)}/content`,
        "Failed to load drawing content"
    );
}

export function saveDrawingContent(
    wsId: string,
    colId: string,
    drawingId: string,
    content: ExcalidrawFile
): Promise<void> {
    return putJson(
        `${API_BASE}/workspaces/${encodeURIComponent(wsId)}/collections/${encodeURIComponent(colId)}/drawings/${encodeURIComponent(drawingId)}/content`,
        content,
        "Failed to save drawing content"
    );
}
