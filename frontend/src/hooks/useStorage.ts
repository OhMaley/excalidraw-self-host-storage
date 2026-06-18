import { useCallback, useEffect, useRef } from "react";

// Types
import type { AppState, BinaryFiles, ExcalidrawProps } from "@excalidraw/excalidraw/types";

// Services
import type { ExcalidrawFile } from "@services/storage";
import { saveDrawingContent } from "@services/storage";

// Utils
import { saveDraft } from "@utils/draftStorage";

// Excalidraw
import { serializeAsJSON } from "@excalidraw/excalidraw";

type OnChangeElements = Parameters<NonNullable<ExcalidrawProps["onChange"]>>[0];

const DRAFT_DEBOUNCE_MS = 800;
const BACKEND_DEBOUNCE_MS = 2000;

export function useStorage(wsId?: string, colId?: string, drawingId?: string) {
    const coordsRef = useRef({ wsId, colId, drawingId });
    useEffect(() => {
        coordsRef.current = { wsId, colId, drawingId };
    });

    const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backendDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingContentRef = useRef<ExcalidrawFile | null>(null);

    const flushSave = useCallback(() => {
        if (backendDebounceRef.current) {
            clearTimeout(backendDebounceRef.current);
            backendDebounceRef.current = null;
        }
        const { wsId: w, colId: c, drawingId: d } = coordsRef.current;
        if (pendingContentRef.current && w && c && d) {
            void saveDrawingContent(w, c, d, pendingContentRef.current);
            pendingContentRef.current = null;
        }
    }, []);

    const save = useCallback(
        (elements: OnChangeElements, appState: AppState, files: BinaryFiles) => {
            const { drawingId: d } = coordsRef.current;

            if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
            draftDebounceRef.current = setTimeout(
                () => saveDraft(d, elements, appState, files),
                DRAFT_DEBOUNCE_MS
            );

            const { wsId: w, colId: c } = coordsRef.current;
            if (w && c && d) {
                pendingContentRef.current = JSON.parse(
                    serializeAsJSON(elements, appState, files, "database")
                ) as ExcalidrawFile;

                if (backendDebounceRef.current) clearTimeout(backendDebounceRef.current);
                backendDebounceRef.current = setTimeout(() => {
                    const { wsId: ww, colId: cc, drawingId: dd } = coordsRef.current;
                    if (pendingContentRef.current && ww && cc && dd) {
                        void saveDrawingContent(ww, cc, dd, pendingContentRef.current);
                        pendingContentRef.current = null;
                    }
                    backendDebounceRef.current = null;
                }, BACKEND_DEBOUNCE_MS);
            }
        },
        []
    );

    useEffect(() => {
        return () => {
            if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
            flushSave();
        };
    }, [flushSave]);

    return { save, flushSave };
}
