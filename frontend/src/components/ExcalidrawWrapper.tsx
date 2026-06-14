import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";

// Components
import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import { TopRightUI } from "@components/TopRightUI";
const NotFound = lazy(() => import("@pages/NotFound"));

// Hooks
import { useStorage } from "@hooks/useStorage";

// Types
import type {
    ExcalidrawImperativeAPI,
    ExcalidrawProps,
    AppState,
    BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { StoredDrawing } from "@services/storage";

// Styles
import "@excalidraw/excalidraw/index.css";

// Utils
import { hydrateScene } from "@utils/sceneUtils";
import { HttpError, HttpStatus } from "@utils/httpError";
import { saveDraft, loadDraft } from "@utils/draftStorage";

type OnChangeElements = Parameters<NonNullable<ExcalidrawProps["onChange"]>>[0];

const DRAFT_DEBOUNCE_MS = 800;

interface ExcalidrawWrapperProps {
    readonly drawingId?: string;
}

type BackendState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; data: StoredDrawing }
    | { status: "error"; error: HttpError };

export default function ExcalidrawWrapper({ drawingId }: ExcalidrawWrapperProps) {
    const { load } = useStorage();
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [backendState, setBackendState] = useState<BackendState>(
        drawingId ? { status: "loading" } : { status: "idle" }
    );

    // Seeded once on mount from localStorage for instant render
    const draftData = useMemo(() => loadDraft(drawingId), [drawingId]);

    // Load drawing from backend when ID exists
    useEffect(() => {
        if (!drawingId) return;

        let cancelled = false;

        const fetchDrawing = async () => {
            setBackendState({ status: "loading" });

            try {
                const data = await load(drawingId);
                if (cancelled) return;
                setBackendState({ status: "ready", data });
            } catch (error) {
                if (cancelled) return;
                if (error instanceof HttpError) {
                    setBackendState({ status: "error", error });
                }
            }
        };

        void fetchDrawing();

        return () => {
            cancelled = true;
        };
    }, [drawingId, load]);

    // Overwrite with backend data once it arrives (authoritative source)
    useEffect(() => {
        if (backendState.status !== "ready") return;
        if (!excalidrawAPIRef.current) return;

        excalidrawAPIRef.current.updateScene(
            hydrateScene(backendState.data, excalidrawAPIRef.current)
        );
    }, [backendState]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // Debounced localStorage save on every change
    const handleChange = useCallback(
        (elements: OnChangeElements, appState: AppState, files: BinaryFiles) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(
                () => saveDraft(drawingId, elements, appState, files),
                DRAFT_DEBOUNCE_MS
            );
        },
        [drawingId]
    );

    if (backendState.status === "error") {
        if (backendState.error.status === HttpStatus.NOT_FOUND) {
            return (
                <Suspense fallback={null}>
                    <NotFound description="Drawing not found" />
                </Suspense>
            );
        }
        return <div>Failed to load drawing</div>;
    }

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <Excalidraw
                excalidrawAPI={(api) => (excalidrawAPIRef.current = api)}
                renderTopRightUI={() => <TopRightUI />}
                initialData={draftData ?? undefined}
                onChange={handleChange}
            >
                <WelcomeScreen />
            </Excalidraw>
        </div>
    );
}
