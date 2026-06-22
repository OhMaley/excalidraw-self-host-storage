import { useCallback, useEffect, useRef, useState } from "react";

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

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DRAFT_DEBOUNCE_MS = 800;
const BACKEND_DEBOUNCE_MS = 2000;
const SAVED_RESET_MS = 3000;

export function useStorage(wsId?: string, colId?: string, drawingId?: string) {
    const coordsRef = useRef({ wsId, colId, drawingId });
    useEffect(() => {
        coordsRef.current = { wsId, colId, drawingId };
    });

    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backendDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingContentRef = useRef<ExcalidrawFile | null>(null);
    const pendingCoordsRef = useRef<{ wsId: string; colId: string; drawingId: string } | null>(
        null
    );

    // Tracks the last serialized content sent to the backend.
    // Used to skip debounce scheduling when Excalidraw fires onChange
    // with unchanged content (viewport updates, cursor state, etc.).
    const lastSentSerializedRef = useRef<string | null>(null);

    // Reset the baseline whenever the active drawing changes.
    useEffect(() => {
        lastSentSerializedRef.current = null;
    }, [drawingId]);

    const performSave = useCallback(
        async (w: string, c: string, d: string, content: ExcalidrawFile) => {
            setSaveStatus("saving");
            try {
                await saveDrawingContent(w, c, d, content);
                setSaveStatus("saved");
                if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
                resetTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_RESET_MS);
            } catch {
                setSaveStatus("error");
            }
        },
        []
    );

    const flushSave = useCallback(() => {
        if (backendDebounceRef.current) {
            clearTimeout(backendDebounceRef.current);
            backendDebounceRef.current = null;
        }
        if (pendingContentRef.current && pendingCoordsRef.current) {
            const { wsId: w, colId: c, drawingId: d } = pendingCoordsRef.current;
            void performSave(w, c, d, pendingContentRef.current);
            pendingContentRef.current = null;
            pendingCoordsRef.current = null;
        }
    }, [performSave]);

    // Called from ExcalidrawWrapper when the restoration onChange fires so the
    // baseline is recorded from the exact merged appState Excalidraw reports,
    // not from the raw backend file (which has an unmerged partial appState).
    const recordBaseline = useCallback(
        (elements: OnChangeElements, appState: AppState, files: BinaryFiles) => {
            lastSentSerializedRef.current = serializeAsJSON(elements, appState, files, "local");
        },
        []
    );

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
                const serialized = serializeAsJSON(elements, appState, files, "local");

                // Skip if the content hasn't changed since the last backend save was queued.
                // This prevents spurious saves from Excalidraw's internal onChange firings
                // (viewport updates, cursor state, collaborator events, etc.).
                if (serialized === lastSentSerializedRef.current) return;
                lastSentSerializedRef.current = serialized;

                pendingContentRef.current = JSON.parse(serialized) as ExcalidrawFile;
                pendingCoordsRef.current = { wsId: w, colId: c, drawingId: d };

                if (backendDebounceRef.current) clearTimeout(backendDebounceRef.current);
                backendDebounceRef.current = setTimeout(() => {
                    if (pendingContentRef.current && pendingCoordsRef.current) {
                        const { wsId: ww, colId: cc, drawingId: dd } = pendingCoordsRef.current;
                        void performSave(ww, cc, dd, pendingContentRef.current);
                        pendingContentRef.current = null;
                        pendingCoordsRef.current = null;
                    }
                    backendDebounceRef.current = null;
                }, BACKEND_DEBOUNCE_MS);
            }
        },
        [performSave]
    );

    useEffect(() => {
        return () => {
            if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            flushSave();
        };
    }, [flushSave]);

    return { save, flushSave, saveStatus, recordBaseline };
}
