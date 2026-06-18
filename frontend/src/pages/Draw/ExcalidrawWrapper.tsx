import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";

// Components
import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import { TopRightUI } from "./TopRightUI";
const NotFound = lazy(() => import("@components/ErrorPages/NotFound"));

// Hooks
import { useStorage } from "@hooks/useStorage";

// Types
import type {
    ExcalidrawImperativeAPI,
    ExcalidrawProps,
    AppState,
    BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawFile } from "@services/storage";

// Styles
import "@excalidraw/excalidraw/index.css";

// Utils
import { hydrateScene } from "@utils/sceneUtils";
import { HttpError, HttpStatus, toHttpError } from "@utils/httpError";
import { loadDraft } from "@utils/draftStorage";

// Services
import { loadDrawingContent } from "@services/storage";

type OnChangeElements = Parameters<NonNullable<ExcalidrawProps["onChange"]>>[0];

interface ExcalidrawWrapperProps {
    readonly wsId?: string;
    readonly colId?: string;
    readonly drawingId?: string;
}

type BackendState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; data: ExcalidrawFile | null }
    | { status: "error"; error: HttpError };

export default function ExcalidrawWrapper({ wsId, colId, drawingId }: ExcalidrawWrapperProps) {
    const { save } = useStorage(wsId, colId, drawingId);
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

    const hasCoords = Boolean(wsId && colId && drawingId);

    const [backendState, setBackendState] = useState<BackendState>(
        hasCoords ? { status: "loading" } : { status: "idle" }
    );

    const draftData = useMemo(() => loadDraft(drawingId), [drawingId]);

    useEffect(() => {
        if (!wsId || !colId || !drawingId) return;

        let cancelled = false;

        const fetchContent = async () => {
            setBackendState({ status: "loading" });
            try {
                const data = await loadDrawingContent(wsId, colId, drawingId);
                if (cancelled) return;
                setBackendState({ status: "ready", data });
            } catch (error) {
                if (cancelled) return;
                setBackendState({
                    status: "error",
                    error: toHttpError(error, "Failed to load drawing"),
                });
            }
        };

        void fetchContent();
        return () => {
            cancelled = true;
        };
    }, [wsId, colId, drawingId]);

    // Apply backend data once loaded (authoritative source)
    useEffect(() => {
        if (backendState.status !== "ready") return;
        if (!excalidrawAPIRef.current) return;

        const { data } = backendState;
        if (!data) return; // null = new drawing, keep empty canvas

        excalidrawAPIRef.current.updateScene(hydrateScene(data, excalidrawAPIRef.current));

        const fileEntries = Object.values(data.files ?? {});
        if (fileEntries.length > 0) {
            excalidrawAPIRef.current.addFiles(fileEntries);
        }
    }, [backendState]);

    const handleChange = useCallback(
        (elements: OnChangeElements, appState: AppState, files: BinaryFiles) => {
            save(elements, appState, files);
        },
        [save]
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
