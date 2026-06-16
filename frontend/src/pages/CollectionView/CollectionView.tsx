import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DropdownMenu, ScrollArea, Select, Separator, Tooltip } from "radix-ui";

// Hooks
import { useCollectionView } from "@hooks/useCollectionView";
import { useWorkspaceTagsAndCollections } from "@hooks/useWorkspaceTagsAndCollections";
import { useToast } from "@hooks/useToast";
import { useWorkspaceCollections } from "@hooks/useWorkspaceCollections";

// Components
import { DeleteCollectionDialog } from "./DeleteCollectionDialog";
import { EditCollectionDialog } from "./EditCollectionDialog";
import { DeleteDrawingDialog } from "./DeleteDrawingDialog";
import { EditDrawingDialog } from "./EditDrawingDialog";
import { DrawingCard } from "@components/DrawingCard";
import { Spinner } from "@components/Spinner";
import { VScrollbar } from "@components/VScrollbar";
import DotsIcon from "@assets/icons/dots.svg?react";
import PencilIcon from "@assets/icons/pencil.svg?react";
import PlusIcon from "@assets/icons/plus.svg?react";
import SearchIcon from "@assets/icons/search.svg?react";
import TrashIcon from "@assets/icons/trash.svg?react";

// Services
import type { Collection } from "@services/collections";
import { deleteCollection } from "@services/collections";
import type { Drawing, DrawingUpdate } from "@services/drawings";

// Utils
import { getColorFromId } from "@utils/colorUtils";
import { getInitials } from "@utils/stringUtils";

// Styles
import styles from "./CollectionView.module.scss";

type SortOrder = "modified" | "created" | "name";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortOrder, string> = {
    modified: "Last modified",
    created: "Date created",
    name: "Name",
};

function applyFilter(drawings: Drawing[], query: string): Drawing[] {
    const q = query.trim().toLowerCase();
    if (!q) return drawings;
    return drawings.filter(
        (d) =>
            d.title.toLowerCase().includes(q) ||
            d.tags.some((t) => t.toLowerCase().includes(q)) ||
            (d.updated_by ?? d.created_by).name.toLowerCase().includes(q)
    );
}

function applySort(drawings: Drawing[], order: SortOrder, dir: SortDir): Drawing[] {
    const sorted = [...drawings].sort((a, b) => {
        if (order === "name") return a.title.localeCompare(b.title);
        if (order === "created")
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return (
            new Date(b.updated_at ?? b.created_at).getTime() -
            new Date(a.updated_at ?? a.created_at).getTime()
        );
    });
    return dir === "asc" ? sorted.reverse() : sorted;
}

interface CollectionPageHeaderProps {
    readonly collection: Collection | null;
    readonly colId: string | undefined;
    readonly onNewDrawing: () => void;
    readonly onEditCollection: () => void;
    readonly onDeleteCollection: () => void;
}

function CollectionDescription({ description }: { readonly description: string }) {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <p className={styles.description}>{description}</p>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content className={styles.descriptionTooltip} side="bottom" sideOffset={6}>
                    {description}
                    <Tooltip.Arrow className={styles.descriptionTooltipArrow} />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

function CollectionPageHeader({
    collection,
    colId,
    onNewDrawing,
    onEditCollection,
    onDeleteCollection,
}: CollectionPageHeaderProps) {
    const avatarColor = colId ? getColorFromId(colId) : undefined;
    const initials = collection ? getInitials(collection.name) : "";
    const createdAt = collection
        ? new Date(collection.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "";
    return (
        <>
            <div className={styles.pageHeader}>
                <div className={styles.identity}>
                    <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
                        {initials}
                    </div>
                    <div className={styles.titleGroup}>
                        <h2 className={styles.pageTitle}>{collection?.name ?? ""}</h2>
                        {createdAt && <span className={styles.createdAt}>Created {createdAt}</span>}
                        {collection?.description && (
                            <CollectionDescription description={collection.description} />
                        )}
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={`btn-md ${styles.newButton}`}
                        onClick={onNewDrawing}
                    >
                        <PlusIcon className={styles.newButtonIcon} />
                        New drawing
                    </button>
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button
                                type="button"
                                className={styles.optionsButton}
                                aria-label="Collection options"
                            >
                                <DotsIcon className={styles.optionsButtonIcon} />
                            </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                className={styles.optionsMenuContent}
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenu.Item
                                    className={styles.optionsMenuItem}
                                    onSelect={onEditCollection}
                                >
                                    <PencilIcon className={styles.optionsMenuItemIcon} />
                                    Edit collection
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                    className={`${styles.optionsMenuItem} ${styles.optionsMenuItemDelete}`}
                                    onSelect={onDeleteCollection}
                                >
                                    <TrashIcon className={styles.optionsMenuItemIcon} />
                                    Delete collection
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </div>
            </div>
            <Separator.Root className={styles.separator} />
        </>
    );
}

interface CollectionToolbarProps {
    readonly searchQuery: string;
    readonly sortOrder: SortOrder;
    readonly sortDir: SortDir;
    readonly onSearchChange: (q: string) => void;
    readonly onSortOrderChange: (order: SortOrder) => void;
    readonly onSortDirToggle: () => void;
}

function CollectionToolbar({
    searchQuery,
    sortOrder,
    sortDir,
    onSearchChange,
    onSortOrderChange,
    onSortDirToggle,
}: CollectionToolbarProps) {
    return (
        <div className={styles.toolbar}>
            <div className={styles.searchBar}>
                <input
                    className={styles.searchInput}
                    type="search"
                    placeholder="Search or filter results…"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                <span className={styles.searchIcon} aria-hidden>
                    <SearchIcon />
                </span>
            </div>
            <div className={styles.sortControls}>
                <Select.Root
                    value={sortOrder}
                    onValueChange={(v) => onSortOrderChange(v as SortOrder)}
                >
                    <Select.Trigger className={styles.sortTrigger} aria-label="Sort by">
                        <Select.Value>{SORT_LABELS[sortOrder]}</Select.Value>
                        <Select.Icon className={styles.sortChevron}>▾</Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                        <Select.Content
                            className={styles.selectContent}
                            position="popper"
                            sideOffset={4}
                        >
                            <Select.Viewport>
                                {(Object.entries(SORT_LABELS) as [SortOrder, string][]).map(
                                    ([value, label]) => (
                                        <Select.Item
                                            key={value}
                                            value={value}
                                            className={styles.selectItem}
                                        >
                                            <Select.ItemText>{label}</Select.ItemText>
                                        </Select.Item>
                                    )
                                )}
                            </Select.Viewport>
                        </Select.Content>
                    </Select.Portal>
                </Select.Root>
                <button
                    type="button"
                    className={styles.sortDirButton}
                    onClick={onSortDirToggle}
                    aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
                    title={sortDir === "asc" ? "Ascending" : "Descending"}
                >
                    {sortDir === "asc" ? "↑" : "↓"}
                </button>
            </div>
        </div>
    );
}

interface CollectionGridProps {
    readonly loading: boolean;
    readonly totalCount: number;
    readonly drawings: Drawing[];
    readonly onEdit: (d: Drawing) => void;
    readonly onDelete: (d: Drawing) => void;
}

function CollectionGrid({ loading, totalCount, drawings, onEdit, onDelete }: CollectionGridProps) {
    if (loading)
        return (
            <div className={styles.spinnerContainer}>
                <Spinner size="1.5rem" />
            </div>
        );
    if (totalCount === 0) return <p className={styles.emptyHint}>No drawings yet. Start one!</p>;
    if (drawings.length === 0)
        return <p className={styles.emptyHint}>No drawings match your search.</p>;
    return (
        <div className={styles.grid}>
            {drawings.map((d) => (
                <DrawingCard
                    key={d.id}
                    drawing={d}
                    to={`/draw/${d.id}`}
                    onEdit={() => onEdit(d)}
                    onDelete={() => onDelete(d)}
                />
            ))}
        </div>
    );
}

interface DrawingCountBarProps {
    readonly total: number;
    readonly visible: number;
    readonly isFiltered: boolean;
}

function DrawingCountBar({ total, visible, isFiltered }: DrawingCountBarProps) {
    const drawingWord = total === 1 ? "drawing" : "drawings";
    const label = isFiltered ? `${visible} of ${total} ${drawingWord}` : `${total} ${drawingWord}`;
    return (
        <div className={styles.countBar}>
            <span className={styles.countLabel}>{label}</span>
            <div className={styles.countDivider} />
        </div>
    );
}

function useCollectionState(drawings: Drawing[]) {
    const [deleteTarget, setDeleteTarget] = useState<Drawing | null>(null);
    const [editTarget, setEditTarget] = useState<Drawing | null>(null);
    const [deleteCollectionTarget, setDeleteCollectionTarget] = useState<Collection | null>(null);
    const [editCollectionTarget, setEditCollectionTarget] = useState<Collection | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<SortOrder>("modified");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const visibleDrawings = useMemo(
        () => applySort(applyFilter(drawings, searchQuery), sortOrder, sortDir),
        [drawings, searchQuery, sortOrder, sortDir]
    );
    return {
        deleteTarget,
        setDeleteTarget,
        editTarget,
        setEditTarget,
        deleteCollectionTarget,
        setDeleteCollectionTarget,
        editCollectionTarget,
        setEditCollectionTarget,
        searchQuery,
        setSearchQuery,
        sortOrder,
        setSortOrder,
        sortDir,
        setSortDir,
        visibleDrawings,
    };
}

function useDeleteCollection(wsId: string | undefined) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { removeCollection } = useWorkspaceCollections();
    return (col: Collection) => {
        deleteCollection(wsId!, col.id)
            .then(() => {
                removeCollection(col.id);
                void navigate(`/workspaces/${wsId}`);
            })
            .catch(() =>
                showToast({
                    title: "Failed to delete collection. Please try again.",
                    variant: "error",
                })
            );
    };
}

interface CollectionDialogsProps {
    readonly deleteTarget: Drawing | null;
    readonly editTarget: Drawing | null;
    readonly deleteCollectionTarget: Collection | null;
    readonly editCollectionTarget: Collection | null;
    readonly collections: Collection[];
    readonly availableTags: string[];
    readonly onCloseDeleteDrawing: () => void;
    readonly onCloseEditDrawing: () => void;
    readonly onCloseDeleteCollection: () => void;
    readonly onCloseEditCollection: () => void;
    readonly onConfirmDeleteDrawing: (d: Drawing) => void;
    readonly onConfirmEditDrawing: (d: Drawing, u: DrawingUpdate) => Promise<void>;
    readonly onConfirmDeleteCollection: (col: Collection) => void;
    readonly onConfirmEditCollection: (name: string, description: string | null) => Promise<void>;
}

function CollectionDialogs({
    deleteTarget,
    editTarget,
    deleteCollectionTarget,
    editCollectionTarget,
    collections,
    availableTags,
    onCloseDeleteDrawing,
    onCloseEditDrawing,
    onCloseDeleteCollection,
    onCloseEditCollection,
    onConfirmDeleteDrawing,
    onConfirmEditDrawing,
    onConfirmDeleteCollection,
    onConfirmEditCollection,
}: CollectionDialogsProps) {
    return (
        <>
            <DeleteDrawingDialog
                drawing={deleteTarget}
                onClose={onCloseDeleteDrawing}
                onConfirm={onConfirmDeleteDrawing}
            />
            <EditDrawingDialog
                drawing={editTarget}
                collections={collections}
                availableTags={availableTags}
                onClose={onCloseEditDrawing}
                onConfirm={onConfirmEditDrawing}
            />
            <DeleteCollectionDialog
                collection={deleteCollectionTarget}
                onClose={onCloseDeleteCollection}
                onConfirm={onConfirmDeleteCollection}
            />
            <EditCollectionDialog
                collection={editCollectionTarget}
                onClose={onCloseEditCollection}
                onConfirm={onConfirmEditCollection}
            />
        </>
    );
}

export default function CollectionView() {
    const { wsId, colId } = useParams<{ wsId: string; colId: string }>();
    const navigate = useNavigate();
    const handleDeleteCollection = useDeleteCollection(wsId);
    const { collection, drawings, loading, handleDelete, handleEdit, handleEditCollection } =
        useCollectionView(wsId, colId);
    const { collections, availableTags, addTags } = useWorkspaceTagsAndCollections(wsId);
    const { updateCollection } = useWorkspaceCollections();

    const handleEditAndSync = (drawing: Drawing, updates: DrawingUpdate) =>
        handleEdit(drawing, updates).then(() => {
            if (updates.tags) addTags(updates.tags);
        });

    const {
        deleteTarget,
        setDeleteTarget,
        editTarget,
        setEditTarget,
        deleteCollectionTarget,
        setDeleteCollectionTarget,
        editCollectionTarget,
        setEditCollectionTarget,
        searchQuery,
        setSearchQuery,
        sortOrder,
        setSortOrder,
        sortDir,
        setSortDir,
        visibleDrawings,
    } = useCollectionState(drawings);

    const openEdit = (d: Drawing) => setTimeout(() => setEditTarget(d), 0);
    const openDelete = (d: Drawing) => setTimeout(() => setDeleteTarget(d), 0);

    return (
        <div className={styles.container}>
            <CollectionPageHeader
                collection={collection}
                colId={colId}
                onNewDrawing={() => void navigate("/draw")}
                onEditCollection={() => setTimeout(() => setEditCollectionTarget(collection), 0)}
                onDeleteCollection={() =>
                    setTimeout(() => setDeleteCollectionTarget(collection), 0)
                }
            />

            <CollectionToolbar
                searchQuery={searchQuery}
                sortOrder={sortOrder}
                sortDir={sortDir}
                onSearchChange={setSearchQuery}
                onSortOrderChange={setSortOrder}
                onSortDirToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            />

            {!loading && drawings.length > 0 && (
                <DrawingCountBar
                    total={drawings.length}
                    visible={visibleDrawings.length}
                    isFiltered={searchQuery.trim() !== ""}
                />
            )}

            <ScrollArea.Root className={styles.scrollRoot}>
                <ScrollArea.Viewport className={styles.scrollViewport}>
                    <CollectionGrid
                        loading={loading}
                        totalCount={drawings.length}
                        drawings={visibleDrawings}
                        onEdit={openEdit}
                        onDelete={openDelete}
                    />
                </ScrollArea.Viewport>
                <VScrollbar />
            </ScrollArea.Root>

            <CollectionDialogs
                deleteTarget={deleteTarget}
                editTarget={editTarget}
                deleteCollectionTarget={deleteCollectionTarget}
                editCollectionTarget={editCollectionTarget}
                collections={collections}
                availableTags={availableTags}
                onCloseDeleteDrawing={() => setDeleteTarget(null)}
                onCloseEditDrawing={() => setEditTarget(null)}
                onCloseDeleteCollection={() => setDeleteCollectionTarget(null)}
                onCloseEditCollection={() => setEditCollectionTarget(null)}
                onConfirmDeleteDrawing={handleDelete}
                onConfirmEditDrawing={handleEditAndSync}
                onConfirmDeleteCollection={handleDeleteCollection}
                onConfirmEditCollection={(name, description) =>
                    handleEditCollection(name, description).then(updateCollection)
                }
            />
        </div>
    );
}
