import { useEffect, useRef, useState, lazy, Suspense } from "react";

// Components
import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import TopRightUI from "@components/TopRightUI";
const NotFound = lazy(() => import("@pages/NotFound"));

// Hooks
import { useStorage } from "@hooks/useStorage";

// Type
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { StoredDrawing } from "@services/storage";

// Styles
import "@excalidraw/excalidraw/index.css";

// Utils
import { hydrateScene } from "@utils/sceneUtils";
import { HttpError, HttpStatus } from "@utils/httpError";

interface ExcalidrawWrapperProps {
    readonly drawingId?: string;
}

type LoadState =
    | { status: "loading" }
    | { status: "ready"; data: StoredDrawing }
    | { status: "error"; error: HttpError };

export default function ExcalidrawWrapper({ drawingId }: ExcalidrawWrapperProps) {
    const { load } = useStorage();
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const [state, setState] = useState<LoadState | null>(drawingId ? { status: "loading" } : null);

    // Load drawing when ID exists
    useEffect(() => {
        if (!drawingId) return;

        let cancelled = false;

        const fetchDrawing = async () => {
            setState({ status: "loading" });

            try {
                const data = await load(drawingId);
                if (cancelled) return;

                setState({ status: "ready", data });
            } catch (error) {
                if (error instanceof HttpError) {
                    setState({ status: "error", error: error });
                }
            }
        };

        void fetchDrawing();

        return () => {
            cancelled = true;
        };
    }, [drawingId, load]);

    // Hydrate Excalidraw once both API + data are ready
    useEffect(() => {
        if (!state) return;
        if (state.status !== "ready") return;
        if (!excalidrawAPIRef.current) return;

        excalidrawAPIRef.current.updateScene(hydrateScene(state.data, excalidrawAPIRef.current));
    }, [state]);

    // Loading state
    if (state?.status === "loading") {
        return null;
    }

    // Error handling
    if (state?.status === "error") {
        if (state.error.status === HttpStatus.NOT_FOUND) {
            return (
                <Suspense fallback={null}>
                    <NotFound description="Drawing not found" />
                </Suspense>
            );
        } else {
            return <div>Failed to load drawing</div>;
        }
    }

    // Excalidraw ready
    return (
        <div style={{ height: "100%", width: "100%" }}>
            <Excalidraw
                excalidrawAPI={(api) => (excalidrawAPIRef.current = api)}
                renderTopRightUI={() => <TopRightUI />}
            >
                <WelcomeScreen />
            </Excalidraw>
        </div>
    );
}
