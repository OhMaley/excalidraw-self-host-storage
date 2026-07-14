import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { exportToSvg, mergeLibraryItems } from "@excalidraw/excalidraw";
import type { ExcalidrawProps, LibraryItems, LibraryItem } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

import ChevronLeftIcon from "@assets/icons/chevron-left.svg?react";
import TrashIcon from "@assets/icons/trash.svg?react";
import PlusIcon from "@assets/icons/plus.svg?react";
import ExitIcon from "@assets/icons/exit.svg?react";

import { SearchBar } from "@components/SearchSortToolbar";
import { SidePanel } from "@components/SidePanel";
import styles from "./LibraryPanel.module.scss";

type SceneElements = Parameters<NonNullable<ExcalidrawProps["onChange"]>>[0];
type ExportElements = readonly ExcalidrawElement[];

// @excalidraw/excalidraw's exportToSvg re-exports from a virtual "@excalidraw/utils/export"
// package that isn't published, so its type can't be resolved — assert it explicitly instead.
interface ExportToSvgOptions {
    readonly elements: ExportElements;
    readonly appState: { exportBackground: boolean; viewBackgroundColor: string };
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
                        appState: { exportBackground: true, viewBackgroundColor: "#ffffff" },
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
                    appState: { exportBackground: true, viewBackgroundColor: "#ffffff" },
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
    return (
        <div className={styles.tile} title={item.name}>
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
}

function CollapsibleSection({
    label,
    count,
    defaultOpen = true,
    children,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className={styles.section}>
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

// ── LibrarySections ───────────────────────────────────────────────────────────

interface LibrarySectionsProps {
    readonly query: string;
    readonly filtered: LibraryItems;
    readonly thumbnails: Map<string, string>;
    readonly onDelete: (id: string) => void;
}

function LibrarySections({ query, filtered, thumbnails, onDelete }: LibrarySectionsProps) {
    return (
        <>
            <CollapsibleSection label="My Library" count={filtered.length}>
                {filtered.length > 0 ? (
                    <div className={styles.itemGrid}>
                        {filtered.map((item) => (
                            <LibraryItemTile
                                key={item.id}
                                item={item}
                                thumbnail={thumbnails.get(item.id)}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <p className={styles.emptySection}>
                        {query ? "No items match your search." : "No items yet."}
                    </p>
                )}
            </CollapsibleSection>

            <CollapsibleSection label="Workspace" defaultOpen={false}>
                <p className={styles.comingSoon}>Coming in a future update</p>
            </CollapsibleSection>

            <CollapsibleSection label="Collection" defaultOpen={false}>
                <p className={styles.comingSoon}>Coming in a future update</p>
            </CollapsibleSection>

            <CollapsibleSection label="Drawing" defaultOpen={false}>
                <p className={styles.comingSoon}>Coming in a future update</p>
            </CollapsibleSection>
        </>
    );
}

// ── SelectionDock ─────────────────────────────────────────────────────────────

interface SelectionDockProps {
    readonly selectedElements: SceneElements;
    readonly onSave: (elements: SceneElements) => void;
}

function SelectionDock({ selectedElements, onSave }: SelectionDockProps) {
    const preview = useSelectionPreview(selectedElements);
    if (selectedElements.length === 0) return null;
    return (
        <div className={styles.selectionDock}>
            <span className={styles.selectionLabel}>
                Selection ({selectedElements.length} element
                {selectedElements.length !== 1 ? "s" : ""})
            </span>
            <div className={styles.previewWrapper}>
                {preview ? (
                    <img src={preview} alt="Selection preview" className={styles.previewImg} />
                ) : (
                    <span className={styles.previewPlaceholder}>Generating preview…</span>
                )}
            </div>
            <button className={styles.saveButton} onClick={() => onSave(selectedElements)}>
                Save to My Library
            </button>
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
                Import from file
            </button>
            <button className={styles.footerButton} onClick={onBrowseExternal}>
                <ExitIcon />
                Browse libraries
            </button>
        </div>
    );
}

// ── LibraryFooter ─────────────────────────────────────────────────────────────

interface LibraryFooterProps {
    readonly selectedElements: SceneElements;
    readonly onSaveSelection: (elements: SceneElements) => void;
    readonly onImportFile: () => void;
    readonly onBrowseExternal: () => void;
}

function LibraryFooter({
    selectedElements,
    onSaveSelection,
    onImportFile,
    onBrowseExternal,
}: LibraryFooterProps) {
    return (
        <>
            <SelectionDock selectedElements={selectedElements} onSave={onSaveSelection} />
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
    const [query, setQuery] = useState("");
    const thumbnails = useLibraryThumbnails(libraryItems);

    const filtered = query
        ? libraryItems.filter((item) =>
              (item.name ?? "").toLowerCase().includes(query.toLowerCase())
          )
        : libraryItems;

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
                    onSaveSelection={handleSaveSelection}
                    onImportFile={handleImportFile}
                    onBrowseExternal={handleBrowseExternal}
                />
            }
        >
            <div className={styles.scrollArea}>
                <div className={styles.scrollViewport}>
                    <LibrarySections
                        query={query}
                        filtered={filtered}
                        thumbnails={thumbnails}
                        onDelete={handleDelete}
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
