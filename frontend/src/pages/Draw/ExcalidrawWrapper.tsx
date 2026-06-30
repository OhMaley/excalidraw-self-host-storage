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
import styles from "./ExcalidrawWrapper.module.scss";

// Utils
import { hydrateScene } from "@utils/sceneUtils";
import { HttpError, HttpStatus, toHttpError } from "@utils/httpError";
import { loadDraft, saveDraft, loadLibrary, saveLibrary } from "@utils/draftStorage";
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

// ─── useAddLibrary ────────────────────────────────────────────────────────────
// Handles the #addLibrary=URL hash protocol used by libraries.excalidraw.com.
// Parses the hash on mount and on hashchange, then applies the library once the
// Excalidraw API is ready. Returns onAPIReady to be passed to excalidrawAPI prop.

const ALLOWED_LIBRARY_HOSTS = new Set(["libraries.excalidraw.com", "raw.githubusercontent.com"]);

function parseAddLibraryHash(hash: string): string | null {
    const match = /[#&]addLibrary=([^&]+)/u.exec(hash);
    if (!match) return null;
    const raw = decodeURIComponent(match[1]);
    try {
        const { protocol, hostname } = new URL(raw);
        return protocol === "https:" && ALLOWED_LIBRARY_HOSTS.has(hostname) ? raw : null;
    } catch {
        return null;
    }
}

function useAddLibrary(excalidrawAPIRef: RefObject<ExcalidrawImperativeAPI | null>) {
    const [isAPIReady, setIsAPIReady] = useState(false);
    const [pendingLibraryUrl, setPendingLibraryUrl] = useState<string | null>(() => {
        const url = parseAddLibraryHash(window.location.hash);
        if (url) history.replaceState(null, "", window.location.pathname + window.location.search);
        return url;
    });

    useEffect(() => {
        const onHashChange = () => {
            const url = parseAddLibraryHash(window.location.hash);
            if (!url) return;
            history.replaceState(null, "", window.location.pathname + window.location.search);
            setPendingLibraryUrl(url);
        };
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    useEffect(() => {
        if (!pendingLibraryUrl || !isAPIReady || !excalidrawAPIRef.current) return;
        const url = pendingLibraryUrl;
        setPendingLibraryUrl(null);
        void fetch(url)
            .then((res) => res.blob())
            .then(
                (blob) =>
                    void excalidrawAPIRef.current?.updateLibrary({
                        libraryItems: blob,
                        merge: true,
                        defaultStatus: "unpublished",
                        openLibraryMenu: true,
                    })
            )
            .catch(() => undefined);
    }, [pendingLibraryUrl, isAPIReady, excalidrawAPIRef]);

    const onAPIReady = useCallback(
        (api: ExcalidrawImperativeAPI) => {
            excalidrawAPIRef.current = api;
            setIsAPIReady(true);
        },
        [excalidrawAPIRef]
    );

    return { onAPIReady };
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
    readonly onChange: (elements: OnChangeElements, appState: AppState, files: BinaryFiles) => void;
    readonly draftData: ReturnType<typeof loadDraft>;
    readonly onAPIReady: (api: ExcalidrawImperativeAPI) => void;
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
    onChange,
    draftData,
    onAPIReady,
}: ExcalidrawCanvasProps) {
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const savedLibrary = useMemo(() => loadLibrary() ?? [], []);
    const initialData = useMemo(() => {
        if (!draftData && savedLibrary.length === 0) return undefined;
        return { ...draftData, libraryItems: savedLibrary };
    }, [draftData, savedLibrary]);

    return (
        <div className={styles.canvas}>
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

            <Excalidraw
                excalidrawAPI={onAPIReady}
                libraryReturnUrl={`${window.location.origin}${window.location.pathname}`}
                renderTopRightUI={() => <TopRightUI />}
                initialData={initialData}
                onLibraryChange={saveLibrary}
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
    const { onAPIReady } = useAddLibrary(excalidrawAPIRef);

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
        <div className={styles.wrapper}>
            {showPanel && <DrawingInfoPanel ref={panelRef} {...panelProps} />}
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
                onChange={handleChange}
                draftData={draftData}
                onAPIReady={onAPIReady}
            />
        </div>
    );
}
