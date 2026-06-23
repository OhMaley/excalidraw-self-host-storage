import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    lazy,
    Suspense,
    type RefObject,
} from "react";

// Components
import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import { TopRightUI } from "./TopRightUI";
import { DrawingTopBar } from "./DrawingTopBar";
import { DrawingInfoPanel } from "./DrawingSidebar";
import { DrawSaveBanner } from "./DrawSaveBanner";
import { SaveToCollectionDialog } from "./SaveToCollectionDialog";
const NotFound = lazy(() => import("@components/ErrorPages/NotFound"));

// Hooks
import { useStorage, type SaveStatus } from "@hooks/useStorage";
import { useAuth } from "@hooks/useAuth";

// Types
import type {
    ExcalidrawImperativeAPI,
    AppState,
    BinaryFiles,
    ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawFile } from "@services/storage";

// Styles
import "@excalidraw/excalidraw/index.css";

// Utils
import { hydrateScene } from "@utils/sceneUtils";
import { HttpError, HttpStatus, toHttpError } from "@utils/httpError";
import { loadDraft, saveDraft } from "@utils/draftStorage";
import { generateAndUploadThumbnail } from "@utils/thumbnail";
import { serializeAsJSON } from "@excalidraw/excalidraw";

// Services
import { loadDrawingContent } from "@services/storage";
import { getDrawing, updateDrawing, type Drawing } from "@services/drawings";

// Extracts the type of the first argument of Excalidraw's onChange prop.
// Using Parameters<> keeps this type in sync with the library automatically.
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

// ─── usePanelState ────────────────────────────────────────────────────────────
// Manages the drawing info panel's open/dock state, click-outside detection,
// and flushes any pending backend save when the active drawing changes.

function usePanelState(drawingId: string | undefined, flushSave: () => void) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isDocked, setIsDocked] = useState(true);

    // Flush any pending save for the previous drawing before the new scene loads.
    useEffect(() => {
        return () => {
            flushSave();
        };
    }, [drawingId, flushSave]);

    // Close the floating panel when the user clicks outside it.
    useEffect(() => {
        if (isDocked || !isPanelOpen) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsPanelOpen(false);
            }
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, [isDocked, isPanelOpen]);

    const handleTogglePanel = useCallback(() => {
        setIsPanelOpen((prev) => !prev);
    }, []);

    return { panelRef, isPanelOpen, setIsPanelOpen, isDocked, setIsDocked, handleTogglePanel };
}

// ─── useDrawingBackend ────────────────────────────────────────────────────────

interface DrawingBackendParams {
    readonly wsId: string | undefined;
    readonly colId: string | undefined;
    readonly drawingId: string | undefined;
    readonly save: (elements: OnChangeElements, appState: AppState, files: BinaryFiles) => void;
    readonly recordBaseline: (
        elements: OnChangeElements,
        appState: AppState,
        files: BinaryFiles
    ) => void;
    readonly excalidrawAPIRef: RefObject<ExcalidrawImperativeAPI | null>;
}

function useDrawingBackend({
    wsId,
    colId,
    drawingId,
    save,
    recordBaseline,
    excalidrawAPIRef,
}: DrawingBackendParams) {
    // Keeps drawingId accessible inside effects without adding it to their deps.
    const drawingIdRef = useRef(drawingId);
    useEffect(() => {
        drawingIdRef.current = drawingId;
    });
    // Saves are blocked until this matches the current drawingId.
    const restoredDrawingIdRef = useRef<string | undefined>(undefined);
    // Set to true before updateScene; blocks the restoration onChange from triggering a save.
    const isRestoringRef = useRef(false);

    const [backendState, setBackendState] = useState<BackendState>(
        wsId && colId && drawingId ? { status: "loading" } : { status: "idle" }
    );
    const [drawingMeta, setDrawingMeta] = useState<Drawing | null>(null);

    // Load drawing content and metadata in parallel; metadata failure is non-critical.
    useEffect(() => {
        if (!wsId || !colId || !drawingId) return;
        let cancelled = false;
        const fetchAll = async () => {
            setBackendState({ status: "loading" });
            try {
                const [data, meta] = await Promise.all([
                    loadDrawingContent(wsId, colId, drawingId),
                    getDrawing(wsId, colId, drawingId).catch(() => null),
                ]);
                if (cancelled) return;
                setBackendState({ status: "ready", data });
                setDrawingMeta(meta);
            } catch (error) {
                if (cancelled) return;
                setBackendState({
                    status: "error",
                    error: toHttpError(error, "Failed to load drawing"),
                });
            }
        };
        void fetchAll();
        return () => {
            cancelled = true;
        };
    }, [wsId, colId, drawingId]);

    // Apply backend data once loaded (authoritative source).
    // Deps: backendState only — drawingId is read via drawingIdRef to avoid
    // re-running this effect with stale data when the drawing changes mid-flight.
    useEffect(() => {
        if (backendState.status !== "ready") return;
        if (!excalidrawAPIRef.current) return;
        const { data } = backendState;
        // Block the single onChange Excalidraw emits after updateScene.
        // recordBaseline is called from handleChange when that event fires.
        isRestoringRef.current = true;
        if (!data) {
            excalidrawAPIRef.current.updateScene({ elements: [] });
        } else {
            excalidrawAPIRef.current.updateScene(hydrateScene(data, excalidrawAPIRef.current));
        }
        restoredDrawingIdRef.current = drawingIdRef.current;
        if (data) {
            const fileEntries = Object.values(data.files ?? {});
            if (fileEntries.length > 0) {
                excalidrawAPIRef.current.addFiles(fileEntries);
            }
        }
    }, [backendState, excalidrawAPIRef]);

    const handleChange = useCallback(
        (elements: OnChangeElements, appState: AppState, files: BinaryFiles) => {
            if (restoredDrawingIdRef.current !== drawingIdRef.current) return;
            if (isRestoringRef.current) {
                isRestoringRef.current = false;
                // Record the baseline so subsequent identical onChange calls are skipped.
                recordBaseline(elements, appState, files);
                return;
            }
            save(elements, appState, files);
        },
        [save, recordBaseline]
    );

    const getContent = useCallback((): ExcalidrawFile | null => {
        if (!excalidrawAPIRef.current) return null;
        const elements = excalidrawAPIRef.current.getSceneElements();
        const appState = excalidrawAPIRef.current.getAppState();
        const files = excalidrawAPIRef.current.getFiles();
        return JSON.parse(serializeAsJSON(elements, appState, files, "local")) as ExcalidrawFile;
    }, [excalidrawAPIRef]);

    return { backendState, drawingMeta, setDrawingMeta, handleChange, getContent };
}

// ─── ExcalidrawCanvas ─────────────────────────────────────────────────────────

interface ExcalidrawCanvasProps {
    readonly isLinkedDrawing: boolean;
    readonly drawingMeta: Drawing | null;
    readonly saveStatus: SaveStatus;
    readonly onToggleSidebar: () => void;
    readonly onTitleChange: (title: string) => void;
    readonly isAuthenticated: boolean;
    readonly authLoading: boolean;
    readonly onSignIn: () => void;
    readonly getContent: () => ExcalidrawFile | null;
    readonly showPanel: boolean;
    readonly panelRef: RefObject<HTMLDivElement | null>;
    readonly panelProps: {
        wsId: string;
        colId: string;
        drawingId: string;
        isDocked: boolean;
        onDockChange: (docked: boolean) => void;
        onClose: () => void;
        updatedDrawing?: Drawing | null;
    };
    readonly onChange: (elements: OnChangeElements, appState: AppState, files: BinaryFiles) => void;
    readonly draftData: ReturnType<typeof loadDraft>;
    readonly excalidrawAPIRef: RefObject<ExcalidrawImperativeAPI | null>;
}

function ExcalidrawCanvas({
    isLinkedDrawing,
    drawingMeta,
    saveStatus,
    onToggleSidebar,
    onTitleChange,
    isAuthenticated,
    authLoading,
    onSignIn,
    getContent,
    showPanel,
    panelRef,
    panelProps,
    onChange,
    draftData,
    excalidrawAPIRef,
}: ExcalidrawCanvasProps) {
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    return (
        <div style={{ flex: 1, position: "relative", height: "100%", minWidth: 0 }}>
            {isLinkedDrawing && drawingMeta && (
                <DrawingTopBar
                    title={drawingMeta.title}
                    saveStatus={saveStatus}
                    onToggleSidebar={onToggleSidebar}
                    onTitleChange={onTitleChange}
                />
            )}

            {!isLinkedDrawing && (
                <>
                    <DrawSaveBanner
                        isAuthenticated={isAuthenticated}
                        authLoading={authLoading}
                        onSignIn={onSignIn}
                        onSaveToCollection={() => setIsSaveDialogOpen(true)}
                    />
                    <SaveToCollectionDialog
                        open={isSaveDialogOpen}
                        onOpenChange={setIsSaveDialogOpen}
                        getContent={getContent}
                    />
                </>
            )}

            {/* Floating panel overlays the canvas; ref used for click-outside detection */}
            {showPanel && !panelProps.isDocked && (
                <DrawingInfoPanel ref={panelRef} {...panelProps} />
            )}

            <Excalidraw
                excalidrawAPI={(api) => (excalidrawAPIRef.current = api)}
                renderTopRightUI={() => <TopRightUI />}
                // Excalidraw's initialData rejects null; ?? undefined converts it
                // to the accepted "no initial data" signal.
                initialData={draftData ?? undefined}
                onChange={onChange}
            >
                <WelcomeScreen />
            </Excalidraw>
        </div>
    );
}

// ─── ExcalidrawWrapper ────────────────────────────────────────────────────────

function signIn(api: ExcalidrawImperativeAPI | null, login: (redirectUri: string) => void): void {
    if (api) saveDraft(undefined, api.getSceneElements(), api.getAppState(), api.getFiles());
    login(window.location.href);
}

export default function ExcalidrawWrapper({ wsId, colId, drawingId }: ExcalidrawWrapperProps) {
    const { isAuthenticated, loading: authLoading, login } = useAuth();

    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

    const handleSaved = useCallback((w: string, c: string, d: string, content: ExcalidrawFile) => {
        void generateAndUploadThumbnail(content, w, c, d);
    }, []);

    const { save, flushSave, saveStatus, recordBaseline } = useStorage(
        wsId,
        colId,
        drawingId,
        handleSaved
    );

    const { backendState, drawingMeta, setDrawingMeta, handleChange, getContent } =
        useDrawingBackend({
            wsId,
            colId,
            drawingId,
            save,
            recordBaseline,
            excalidrawAPIRef,
        });

    const [updatedDrawingForPanel, setUpdatedDrawingForPanel] = useState<Drawing | null>(null);

    const handleTitleChange = useCallback(
        async (newTitle: string) => {
            if (!wsId || !colId || !drawingId || !drawingMeta) return;
            const prev = drawingMeta;
            setDrawingMeta({ ...prev, title: newTitle });
            try {
                const updated = await updateDrawing(wsId, colId, drawingId, { title: newTitle });
                setDrawingMeta(updated);
                setUpdatedDrawingForPanel(updated);
            } catch {
                setDrawingMeta(prev);
            }
        },
        [wsId, colId, drawingId, drawingMeta, setDrawingMeta]
    );

    // True only when all three IDs are present — this is a saved, backend-linked drawing.
    const isLinkedDrawing = Boolean(wsId && colId && drawingId);
    const draftData = useMemo(() => loadDraft(drawingId), [drawingId]);

    const { panelRef, isPanelOpen, setIsPanelOpen, isDocked, setIsDocked, handleTogglePanel } =
        usePanelState(drawingId, flushSave);

    // Flush the draft before the Keycloak redirect so the latest canvas state
    // is preserved in localStorage across the auth round-trip.
    const handleSignIn = useCallback(() => signIn(excalidrawAPIRef.current, login), [login]);

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

    const showPanel = isLinkedDrawing && isPanelOpen;
    const panelProps = {
        wsId: wsId!,
        colId: colId!,
        drawingId: drawingId!,
        isDocked,
        onDockChange: setIsDocked,
        onClose: () => setIsPanelOpen(false),
        updatedDrawing: updatedDrawingForPanel,
    };

    return (
        <div style={{ height: "100%", width: "100%", display: "flex" }}>
            {/* Docked panel sits in flex flow, pushing the canvas to the right */}
            {showPanel && isDocked && <DrawingInfoPanel {...panelProps} />}
            <ExcalidrawCanvas
                isLinkedDrawing={isLinkedDrawing}
                drawingMeta={drawingMeta}
                saveStatus={saveStatus}
                onToggleSidebar={handleTogglePanel}
                onTitleChange={(title) => void handleTitleChange(title)}
                isAuthenticated={isAuthenticated}
                authLoading={authLoading}
                onSignIn={handleSignIn}
                getContent={getContent}
                showPanel={showPanel}
                panelRef={panelRef}
                panelProps={panelProps}
                onChange={handleChange}
                draftData={draftData}
                excalidrawAPIRef={excalidrawAPIRef}
            />
        </div>
    );
}
