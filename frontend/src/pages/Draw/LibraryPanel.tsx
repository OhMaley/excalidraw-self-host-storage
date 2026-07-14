import {
    forwardRef,
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { Separator } from "radix-ui";
import {
    exportToSvg,
    mergeLibraryItems,
    MIME_TYPES,
    serializeLibraryAsJSON,
} from "@excalidraw/excalidraw";
import type { ExcalidrawProps, LibraryItems, LibraryItem } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

import ChevronLeftIcon from "@assets/icons/chevron-left.svg?react";
import TrashIcon from "@assets/icons/trash.svg?react";
import PlusIcon from "@assets/icons/plus.svg?react";
import ExitIcon from "@assets/icons/exit.svg?react";

import { SearchBar } from "@components/SearchSortToolbar";
import { SidePanel } from "@components/SidePanel";
import { useAuth } from "@hooks/useAuth";
import styles from "./LibraryPanel.module.scss";

// Requires an authenticated session — kept out of the anonymous bundle.
const AuthenticatedLibrarySections = lazy(() => import("./AuthenticatedLibrarySections"));

// Custom drag type for dragging a canvas selection preview onto a library
// section to save it — internal to this panel, not related to MIME_TYPES.
const SELECTION_DRAG_TYPE = "application/x-excalidraw-panel-selection";

type SceneElements = Parameters<NonNullable<ExcalidrawProps["onChange"]>>[0];
type ExportElements = readonly ExcalidrawElement[];

// @excalidraw/excalidraw's exportToSvg re-exports from a virtual "@excalidraw/utils/export"
// package that isn't published, so its type can't be resolved — assert it explicitly instead.
interface ExportToSvgOptions {
    readonly elements: ExportElements;
    readonly appState: { exportBackground: boolean };
    readonly files: null;
}

const typedExportToSvg = exportToSvg as unknown as (
    opts: ExportToSvgOptions
) => Promise<SVGSVGElement>;

// ── parseLibraryFile ─────────────────────────────────────────────────────────

function parseLibraryFile(json: unknown): LibraryItems | null {
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    const obj = json as Record<string, unknown>;

    if (obj.type === "excalidrawlib" && obj.version === 2 && Array.isArray(obj.library)) {
        return obj.library as LibraryItems;
    }

    if (Array.isArray(obj.libraryItems)) {
        return obj.libraryItems as LibraryItems;
    }

    return null;
}

// ── useLibraryThumbnails ─────────────────────────────────────────────────────

function useLibraryThumbnails(items: LibraryItems): Map<string, string> {
    const cacheRef = useRef<Map<string, string>>(new Map());
    const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        let cancelled = false;
        const generate = async () => {
            const cache = cacheRef.current;
            let changed = false;

            for (const item of items) {
                if (cache.has(item.id)) continue;
                try {
                    const svgEl = await typedExportToSvg({
                        elements: item.elements,
                        appState: { exportBackground: false },
                        files: null,
                    });
                    if (cancelled) return;
                    const svgStr = new XMLSerializer().serializeToString(svgEl);
                    cache.set(
                        item.id,
                        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
                    );
                    changed = true;
                } catch {
                    // skip items that fail to render
                }
            }

            if (changed && !cancelled) {
                setThumbnails(new Map(cache));
            }
        };
        void generate();
        return () => {
            cancelled = true;
        };
    }, [items]);

    return thumbnails;
}

// ── useSelectionPreview ──────────────────────────────────────────────────────

function useSelectionPreview(elements: SceneElements): string | null {
    const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
    const prevKeyRef = useRef("");

    useEffect(() => {
        if (elements.length === 0) return;
        const key = [...elements]
            .map((el) => el.id)
            .sort((a, b) => a.localeCompare(b))
            .join(",");
        if (key === prevKeyRef.current) return;
        prevKeyRef.current = key;

        let cancelled = false;
        const generate = async () => {
            try {
                const svgEl = await typedExportToSvg({
                    elements,
                    appState: { exportBackground: false },
                    files: null,
                });
                if (cancelled) return;
                const svgStr = new XMLSerializer().serializeToString(svgEl);
                setGeneratedPreview(
                    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
                );
            } catch {
                setGeneratedPreview(null);
            }
        };
        void generate();
        return () => {
            cancelled = true;
        };
    }, [elements]);

    return elements.length === 0 ? null : generatedPreview;
}

// ── LibraryItemTile ───────────────────────────────────────────────────────────

interface LibraryItemTileProps {
    readonly item: LibraryItem;
    readonly thumbnail: string | undefined;
    readonly onDelete: (id: string) => void;
}

function LibraryItemTile({ item, thumbnail, onDelete }: LibraryItemTileProps) {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData(MIME_TYPES.excalidrawlib, serializeLibraryAsJSON([item]));
        e.dataTransfer.effectAllowed = "copy";
    };

    return (
        <div className={styles.tile} title={item.name} draggable onDragStart={handleDragStart}>
            {thumbnail ? (
                <img src={thumbnail} alt={item.name ?? "Library item"} className={styles.tileImg} />
            ) : (
                <div className={styles.tileImg} />
            )}
            {item.name && <span className={styles.tileName}>{item.name}</span>}
            <button
                className={styles.deleteButton}
                onClick={() => onDelete(item.id)}
                title="Remove from library"
                aria-label="Remove from library"
            >
                <TrashIcon />
            </button>
        </div>
    );
}

// ── CollapsibleSection ────────────────────────────────────────────────────────

interface CollapsibleSectionProps {
    readonly label: string;
    readonly count?: number;
    readonly defaultOpen?: boolean;
    readonly children: ReactNode;
    // When set, this section accepts a dragged selection preview (see
    // SelectionDock) and calls this instead of saving it.
    readonly onDropSelection?: () => void;
}

export function CollapsibleSection({
    label,
    count,
    defaultOpen = true,
    children,
    onDropSelection,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isDragOver, setIsDragOver] = useState(false);

    const isSelectionDrag = (e: React.DragEvent<HTMLDivElement>) =>
        e.dataTransfer.types.includes(SELECTION_DRAG_TYPE);

    return (
        <div
            className={`${styles.section} ${isDragOver ? styles.sectionDragOver : ""}`}
            onDragOver={
                onDropSelection
                    ? (e) => {
                          if (!isSelectionDrag(e)) return;
                          e.preventDefault();
                          setIsDragOver(true);
                      }
                    : undefined
            }
            onDragLeave={onDropSelection ? () => setIsDragOver(false) : undefined}
            onDrop={
                onDropSelection
                    ? (e) => {
                          if (!isSelectionDrag(e)) return;
                          e.preventDefault();
                          setIsDragOver(false);
                          onDropSelection();
                      }
                    : undefined
            }
        >
            <button className={styles.sectionHeader} onClick={() => setIsOpen((p) => !p)}>
                <ChevronLeftIcon
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : styles.chevronClosed}`}
                />
                <span className={styles.sectionLabel}>{label}</span>
                {count !== undefined && <span className={styles.sectionCount}>{count}</span>}
            </button>
            {isOpen && children}
        </div>
    );
}

// ── LibraryItemGrid ───────────────────────────────────────────────────────────

interface LibraryItemGridProps {
    readonly items: LibraryItems;
    readonly emptyMessage: string;
    readonly thumbnails: Map<string, string>;
    readonly onDelete: (id: string) => void;
}

function LibraryItemGrid({ items, emptyMessage, thumbnails, onDelete }: LibraryItemGridProps) {
    if (items.length === 0) return <p className={styles.emptySection}>{emptyMessage}</p>;
    return (
        <div className={styles.itemGrid}>
            {items.map((item) => (
                <LibraryItemTile
                    key={item.id}
                    item={item}
                    thumbnail={thumbnails.get(item.id)}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

// ── LibrarySections ───────────────────────────────────────────────────────────

interface LibrarySectionsProps {
    readonly query: string;
    readonly personalItems: LibraryItems;
    readonly externalItems: LibraryItems;
    readonly thumbnails: Map<string, string>;
    readonly onDelete: (id: string) => void;
    readonly isAuthenticated: boolean;
    readonly selectedElements: SceneElements;
    readonly onDropSelection: (elements: SceneElements) => void;
}

function LibrarySections({
    query,
    personalItems,
    externalItems,
    thumbnails,
    onDelete,
    isAuthenticated,
    selectedElements,
    onDropSelection,
}: LibrarySectionsProps) {
    const noMatchMessage = query ? "No items match your search." : null;
    return (
        <>
            <CollapsibleSection
                label="My Library"
                count={personalItems.length}
                onDropSelection={() => onDropSelection(selectedElements)}
            >
                <LibraryItemGrid
                    items={personalItems}
                    emptyMessage={noMatchMessage ?? "No items yet."}
                    thumbnails={thumbnails}
                    onDelete={onDelete}
                />
            </CollapsibleSection>

            <CollapsibleSection label="External" count={externalItems.length}>
                <LibraryItemGrid
                    items={externalItems}
                    emptyMessage={noMatchMessage ?? "Imported libraries will appear here."}
                    thumbnails={thumbnails}
                    onDelete={onDelete}
                />
            </CollapsibleSection>

            {isAuthenticated && (
                <Suspense fallback={null}>
                    <AuthenticatedLibrarySections />
                </Suspense>
            )}
        </>
    );
}

// ── SelectionDock ─────────────────────────────────────────────────────────────

interface SelectionDockProps {
    readonly selectedElements: SceneElements;
}

function SelectionDock({ selectedElements }: SelectionDockProps) {
    const preview = useSelectionPreview(selectedElements);
    if (selectedElements.length === 0) return null;

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData(SELECTION_DRAG_TYPE, "1");
        e.dataTransfer.effectAllowed = "copy";
    };

    return (
        <div className={styles.selectionDock}>
            <span className={styles.selectionLabel}>
                Selection ({selectedElements.length} element
                {selectedElements.length !== 1 ? "s" : ""})
            </span>
            <div className={styles.previewWrapper} draggable onDragStart={handleDragStart}>
                {preview ? (
                    <img src={preview} alt="Selection preview" className={styles.previewImg} />
                ) : (
                    <span className={styles.previewPlaceholder}>Generating preview…</span>
                )}
            </div>
            <p className={styles.dragHint}>Drag the preview onto a section to save it</p>
        </div>
    );
}

// ── AddActionsFooter ──────────────────────────────────────────────────────────

interface AddActionsFooterProps {
    readonly onImportFile: () => void;
    readonly onBrowseExternal: () => void;
}

function AddActionsFooter({ onImportFile, onBrowseExternal }: AddActionsFooterProps) {
    return (
        <div className={styles.footer}>
            <button className={styles.footerButton} onClick={onImportFile}>
                <PlusIcon />
                Import
            </button>
            <span className={styles.footerOrGroup}>
                <span className={styles.footerOr}>or</span>
            </span>
            <button className={styles.footerButton} onClick={onBrowseExternal}>
                <ExitIcon />
                Browse
            </button>
        </div>
    );
}

// ── LibraryFooter ─────────────────────────────────────────────────────────────

interface LibraryFooterProps {
    readonly selectedElements: SceneElements;
    readonly onImportFile: () => void;
    readonly onBrowseExternal: () => void;
}

function LibraryFooter({ selectedElements, onImportFile, onBrowseExternal }: LibraryFooterProps) {
    return (
        <>
            <SelectionDock selectedElements={selectedElements} />
            {selectedElements.length > 0 && <Separator.Root className={styles.footerSeparator} />}
            <AddActionsFooter onImportFile={onImportFile} onBrowseExternal={onBrowseExternal} />
        </>
    );
}

// ── useLibraryItemActions ─────────────────────────────────────────────────────

function useLibraryItemActions(
    libraryItems: LibraryItems,
    onItemsChange: (updated: LibraryItems) => Promise<void>
) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDelete = useCallback(
        (id: string) => {
            void onItemsChange(libraryItems.filter((item) => item.id !== id));
        },
        [libraryItems, onItemsChange]
    );

    const handleSaveSelection = useCallback(
        (elements: SceneElements) => {
            const newItem: LibraryItem = {
                id: crypto.randomUUID(),
                status: "unpublished",
                elements: elements,
                created: Date.now(),
            };
            void onItemsChange(mergeLibraryItems(libraryItems, [newItem]));
        },
        [libraryItems, onItemsChange]
    );

    const handleImportFile = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const json = JSON.parse(reader.result as string) as unknown;
                    const parsed = parseLibraryFile(json);
                    if (parsed) {
                        void onItemsChange(mergeLibraryItems(libraryItems, parsed));
                    }
                } catch {
                    // invalid file, ignore
                }
            };
            reader.readAsText(file);
            e.target.value = "";
        },
        [libraryItems, onItemsChange]
    );

    const handleBrowseExternal = useCallback(() => {
        const referrer = `${window.location.origin}${window.location.pathname}`;
        const url = `https://libraries.excalidraw.com/?referrer=${encodeURIComponent(referrer)}&useHash=true&token=lib&theme=light&version=2`;
        window.open(url, "_blank", "noopener,noreferrer");
    }, []);

    return {
        fileInputRef,
        handleDelete,
        handleSaveSelection,
        handleImportFile,
        handleFileChange,
        handleBrowseExternal,
    };
}

// ── LibraryPanel ──────────────────────────────────────────────────────────────

export interface LibraryPanelProps {
    readonly isDocked: boolean;
    readonly onDockChange: (docked: boolean) => void;
    readonly onClose: () => void;
    readonly selectedElements: SceneElements;
    readonly libraryItems: LibraryItems;
    readonly onItemsChange: (updated: LibraryItems) => Promise<void>;
}

export const LibraryPanel = forwardRef<HTMLDivElement, LibraryPanelProps>(function LibraryPanel(
    { isDocked, onDockChange, onClose, selectedElements, libraryItems, onItemsChange },
    ref
) {
    const { isAuthenticated } = useAuth();
    const [query, setQuery] = useState("");
    const thumbnails = useLibraryThumbnails(libraryItems);

    const filtered = query
        ? libraryItems.filter((item) =>
              (item.name ?? "").toLowerCase().includes(query.toLowerCase())
          )
        : libraryItems;

    // Items imported from a file are routed by their own "published" attribute
    // (from libraries.excalidraw.com's convention); items merged in via the
    // browse-external flow are tagged "published" too — see useAddLibrary.
    const personalItems = filtered.filter((item) => item.status !== "published");
    const externalItems = filtered.filter((item) => item.status === "published");

    const {
        fileInputRef,
        handleDelete,
        handleSaveSelection,
        handleImportFile,
        handleFileChange,
        handleBrowseExternal,
    } = useLibraryItemActions(libraryItems, onItemsChange);

    return (
        <SidePanel
            ref={ref}
            side="right"
            width="280px"
            isDocked={isDocked}
            onDockChange={onDockChange}
            onClose={onClose}
            closeLabel="Close library"
            title={<span className={styles.title}>Library</span>}
            search={<SearchBar value={query} placeholder="Search library…" onChange={setQuery} />}
            footer={
                <LibraryFooter
                    selectedElements={selectedElements}
                    onImportFile={handleImportFile}
                    onBrowseExternal={handleBrowseExternal}
                />
            }
        >
            <div className={styles.scrollArea}>
                <div className={styles.scrollViewport}>
                    <LibrarySections
                        query={query}
                        personalItems={personalItems}
                        externalItems={externalItems}
                        thumbnails={thumbnails}
                        onDelete={handleDelete}
                        isAuthenticated={isAuthenticated}
                        selectedElements={selectedElements}
                        onDropSelection={handleSaveSelection}
                    />
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".excalidrawlib,.excalidraw,.json"
                style={{ display: "none" }}
                onChange={handleFileChange}
            />
        </SidePanel>
    );
});
