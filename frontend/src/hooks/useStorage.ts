import { useCallback, useEffect, useRef, useState } from "react";

// Types
import type { AppState, BinaryFiles, ExcalidrawProps } from "@excalidraw/excalidraw/types";

// Services
import type { ExcalidrawFile } from "@services/storage";
import { saveDrawingContent } from "@services/storage";

// Utils
import { saveDraft } from "@utils/draftStorage";
import { AuthError } from "@utils/httpError";

// Hooks
import { useAuth } from "@hooks/useAuth";
import type { SessionStatus } from "@hooks/useKeycloakInit";

// Excalidraw
import { serializeAsJSON } from "@excalidraw/excalidraw";

type OnChangeElements = Parameters<NonNullable<ExcalidrawProps["onChange"]>>[0];

// "retrying": a save failed for a transient reason (offline, or the session
// token failed to refresh) and is being retried automatically with backoff —
// the content is safe (already in the local draft) and will reach the
// backend once connectivity/the session recovers, no user action needed.
// "session-expired": the session itself is dead (refresh token expired) —
// nothing will self-heal; the user needs to sign in again.
export type SaveStatus = "idle" | "saving" | "saved" | "error" | "retrying" | "session-expired";

export type OnSavedCallback = (
    wsId: string,
    colId: string,
    drawingId: string,
    content: ExcalidrawFile
) => void;

const DRAFT_DEBOUNCE_MS = 800;
const BACKEND_DEBOUNCE_MS = 2000;
const SAVED_RESET_MS = 3000;
const RETRY_BASE_DELAY_MS = 2000;
const RETRY_MAX_DELAY_MS = 30000;

interface SaveTarget {
    wsId: string;
    colId: string;
    drawingId: string;
    content: ExcalidrawFile;
}

// Owns backoff-retry scheduling for a failed save: keeps the last-failed
// target, retries with capped exponential backoff, and retries immediately
// on reconnect or once the session is confirmed active again. The actual save
// function is supplied later via `registerRun` (called from an effect, once
// it exists) rather than as a parameter here — it depends on `scheduleRetry`/
// `clearRetry` below, so it can't be constructed before this hook runs.
function useSaveRetry(sessionStatus: SessionStatus) {
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryAttemptRef = useRef(0);
    const lastFailedRef = useRef<SaveTarget | null>(null);
    const runRef = useRef<(target: SaveTarget) => void>(() => undefined);

    const registerRun = useCallback((run: (target: SaveTarget) => void) => {
        runRef.current = run;
    }, []);

    useEffect(() => {
        return () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, []);

    const clearRetry = useCallback(() => {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
        retryAttemptRef.current = 0;
        lastFailedRef.current = null;
    }, []);

    const retryNow = useCallback(() => {
        const failed = lastFailedRef.current;
        if (!failed) return;
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        runRef.current(failed);
    }, []);

    const scheduleRetry = useCallback((target: SaveTarget) => {
        lastFailedRef.current = target;
        retryAttemptRef.current += 1;
        const delay = Math.min(
            RETRY_BASE_DELAY_MS * 2 ** (retryAttemptRef.current - 1),
            RETRY_MAX_DELAY_MS
        );
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            runRef.current(target);
        }, delay);
    }, []);

    // Retry immediately on reconnect rather than waiting out the backoff delay.
    useEffect(() => {
        window.addEventListener("online", retryNow);
        return () => window.removeEventListener("online", retryNow);
    }, [retryNow]);

    // Resume as soon as the session is confirmed active again (token refresh
    // succeeded, or the user signed back in after a "session-expired" state).
    useEffect(() => {
        if (sessionStatus === "active") retryNow();
    }, [sessionStatus, retryNow]);

    return { registerRun, scheduleRetry, clearRetry };
}

// Owns the async save call, save status state, failure retry, and onSaved notification.
function usePerformSave(onSaved: OnSavedCallback | undefined) {
    const { sessionStatus } = useAuth();
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Kept in a ref so performSave (stable useCallback) always calls the latest version.
    const onSavedRef = useRef(onSaved);
    useEffect(() => {
        onSavedRef.current = onSaved;
    });
    useEffect(() => {
        return () => {
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        };
    }, []);

    const { registerRun, scheduleRetry, clearRetry } = useSaveRetry(sessionStatus);

    const performSave = useCallback(
        async (w: string, c: string, d: string, content: ExcalidrawFile) => {
            setSaveStatus("saving");
            try {
                await saveDrawingContent(w, c, d, content);
                clearRetry();
                setSaveStatus("saved");
                if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
                resetTimerRef.current = setTimeout(() => setSaveStatus("idle"), SAVED_RESET_MS);
                onSavedRef.current?.(w, c, d, content);
            } catch (err) {
                const target: SaveTarget = { wsId: w, colId: c, drawingId: d, content };
                if (err instanceof AuthError) {
                    // Token refresh failed — the request was never sent. If the
                    // session is confirmed dead, retrying is pointless until the
                    // user signs back in; otherwise treat it like any other
                    // transient failure and keep trying in the background.
                    if (sessionStatus === "expired") {
                        setSaveStatus("session-expired");
                    } else {
                        scheduleRetry(target);
                        setSaveStatus("retrying");
                    }
                } else if (err instanceof TypeError) {
                    // fetch() itself threw — no connectivity. Always worth retrying.
                    scheduleRetry(target);
                    setSaveStatus("retrying");
                } else {
                    // A real response came back (4xx/5xx) — not a connectivity
                    // problem, so retrying automatically wouldn't help.
                    clearRetry();
                    setSaveStatus("error");
                }
            }
        },
        [clearRetry, scheduleRetry, sessionStatus]
    );

    useEffect(() => {
        registerRun(
            (target) =>
                void performSave(target.wsId, target.colId, target.drawingId, target.content)
        );
    }, [registerRun, performSave]);

    return { saveStatus, performSave };
}

export function useStorage(
    wsId?: string,
    colId?: string,
    drawingId?: string,
    onSaved?: OnSavedCallback
) {
    const coordsRef = useRef({ wsId, colId, drawingId });
    useEffect(() => {
        coordsRef.current = { wsId, colId, drawingId };
    });

    const { saveStatus, performSave } = usePerformSave(onSaved);

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
            flushSave();
        };
    }, [flushSave]);

    return { save, flushSave, saveStatus, recordBaseline };
}
