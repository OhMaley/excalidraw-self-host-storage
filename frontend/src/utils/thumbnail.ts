import { exportToBlob } from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles, ExcalidrawProps } from "@excalidraw/excalidraw/types";

import { uploadThumbnail } from "@services/drawings";
import type { ExcalidrawFile } from "@services/storage";

const THUMBNAIL_MAX_WIDTH = 800;
const THUMBNAIL_MAX_HEIGHT = 600;

type ExportToBlobFn = (opts: {
    elements: Parameters<NonNullable<ExcalidrawProps["onChange"]>>[0];
    appState: AppState;
    files: BinaryFiles;
    mimeType?: string;
    getDimensions?: (w: number, h: number) => { width: number; height: number; scale?: number };
}) => Promise<Blob>;

export async function generateAndUploadThumbnail(
    content: ExcalidrawFile,
    wsId: string,
    colId: string,
    drawingId: string
): Promise<void> {
    if ((content.elements ?? []).length === 0) return;
    try {
        const blob = await (exportToBlob as unknown as ExportToBlobFn)({
            elements: content.elements,
            appState: content.appState as AppState,
            files: content.files ?? {},
            mimeType: "image/png",
            getDimensions: (naturalWidth: number, naturalHeight: number) => {
                const scale = Math.min(
                    THUMBNAIL_MAX_WIDTH / naturalWidth,
                    THUMBNAIL_MAX_HEIGHT / naturalHeight
                );
                return {
                    width: Math.round(naturalWidth * scale),
                    height: Math.round(naturalHeight * scale),
                    scale,
                };
            },
        });
        await uploadThumbnail(wsId, colId, drawingId, blob);
    } catch {
        // Thumbnail generation is best-effort; failures are non-fatal.
    }
}
