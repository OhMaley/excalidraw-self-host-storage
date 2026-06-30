import { forwardRef, useEffect, useReducer, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Avatar, ScrollArea, Separator, Tooltip } from "radix-ui";

import PinIcon from "@assets/icons/pin.svg?react";
import XIcon from "@assets/icons/x.svg?react";
import FolderIcon from "@assets/icons/folder.svg?react";
import PlusIcon from "@assets/icons/plus.svg?react";
import ChevronLeftIcon from "@assets/icons/chevron-left.svg?react";

import { SearchBar } from "@components/SearchSortToolbar";
import { useCollectionView } from "@hooks/useCollectionView";
import { useThumbnail } from "@hooks/useThumbnail";
import { createCollection, listCollections, type Collection } from "@services/collections";
import {
    createWorkspace,
    getWorkspace,
    listWorkspaces,
    type Workspace,
} from "@services/workspaces";
import { createDrawing, type Drawing } from "@services/drawings";
import {
    getInitials,
    nextCollectionName,
    nextDrawingName,
    nextWorkspaceName,
} from "@utils/stringUtils";
import { getColorFromId } from "@utils/colorUtils";
import { relativeTime } from "@utils/timeUtils";

import styles from "./DrawingSidebar.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarView = "drawings" | "collections" | "workspaces";

// ─── Navigation state (reducer) ──────────────────────────────────────────────

interface NavState {
    view: SidebarView;
    browsingWsId: string;
    browsingColId: string;
    searchQuery: string;
    sortAsc: boolean;
}

type NavAction =
    | { type: "URL_CHANGED"; wsId: string; colId: string }
    | { type: "GO_UP"; urlWsId: string }
    | { type: "SELECT_COLLECTION"; col: Collection }
    | { type: "SELECT_WORKSPACE"; ws: Workspace }
    | { type: "SET_SEARCH"; query: string }
    | { type: "TOGGLE_SORT" };

function navReducer(state: NavState, action: NavAction): NavState {
    switch (action.type) {
        case "URL_CHANGED":
            return {
                view: "drawings",
                browsingWsId: action.wsId,
                browsingColId: action.colId,
                searchQuery: "",
                sortAsc: false,
            };
        case "GO_UP":
            if (state.view === "drawings")
                return {
                    ...state,
                    view: "collections",
                    browsingColId: "",
                    searchQuery: "",
                    sortAsc: false,
                };
            if (state.view === "collections")
                return {
                    ...state,
                    view: "workspaces",
                    browsingWsId: action.urlWsId,
                    searchQuery: "",
                    sortAsc: false,
                };
            return state;
        case "SELECT_COLLECTION":
            return {
                ...state,
                view: "drawings",
                browsingWsId: action.col.workspace_id,
                browsingColId: action.col.id,
                searchQuery: "",
                sortAsc: false,
            };
        case "SELECT_WORKSPACE":
            return {
                ...state,
                view: "collections",
                browsingWsId: action.ws.id,
                browsingColId: "",
                searchQuery: "",
                sortAsc: false,
            };
        case "SET_SEARCH":
            return { ...state, searchQuery: action.query };
        case "TOGGLE_SORT":
            return { ...state, sortAsc: !state.sortAsc };
    }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface DrawingItemProps {
    readonly drawing: Drawing;
    readonly isActive: boolean;
    readonly wsId: string;
    readonly colId: string;
}

function DrawingItem({ drawing, isActive, wsId, colId }: DrawingItemProps) {
    const time = relativeTime(drawing.updated_at ?? drawing.created_at);
    const author = (drawing.updated_by ?? drawing.created_by).name;
    const to = `/workspaces/${wsId}/collections/${colId}/drawings/${drawing.id}`;
    const thumbnailUrl = useThumbnail(wsId, drawing);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const [isTitleClamped, setIsTitleClamped] = useState(false);

    useEffect(() => {
        const el = titleRef.current;
        if (el) setIsTitleClamped(el.scrollHeight > el.clientHeight);
    }, [drawing.title]);

    const showTooltip = isTitleClamped || !!drawing.description;

    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <NavLink
                    to={to}
                    className={`${styles.drawingItem} ${isActive ? styles.activeItem : ""}`}
                >
                    <div
                        className={
                            thumbnailUrl
                                ? `${styles.thumbnail} ${styles.thumbnailWithImage}`
                                : styles.thumbnail
                        }
                    >
                        {thumbnailUrl && (
                            <img
                                src={thumbnailUrl}
                                alt=""
                                className={styles.thumbnailImage}
                                aria-hidden="true"
                            />
                        )}
                    </div>
                    <div className={styles.drawingInfo}>
                        <div className={styles.drawingTitleWrapper}>
                            <p ref={titleRef} className={styles.drawingTitle}>
                                {drawing.title}
                            </p>
                        </div>
                        <div className={styles.drawingMeta}>
                            <p className={styles.drawingAuthor}>by {author}</p>
                            <p className={styles.drawingTime}>{time}</p>
                        </div>
                    </div>
                </NavLink>
            </Tooltip.Trigger>
            {showTooltip && (
                <Tooltip.Portal>
                    <Tooltip.Content className={styles.tooltip} side="right" sideOffset={8}>
                        <span className={styles.tooltipTitle}>{drawing.title}</span>
                        {drawing.description && (
                            <span className={styles.tooltipDescription}>{drawing.description}</span>
                        )}
                        <Tooltip.Arrow className={styles.tooltipArrow} />
                    </Tooltip.Content>
                </Tooltip.Portal>
            )}
        </Tooltip.Root>
    );
}

interface CollectionItemProps {
    readonly collection: Collection;
    readonly isActive: boolean;
    readonly onClick: () => void;
}

function CollectionItem({ collection, isActive, onClick }: CollectionItemProps) {
    return (
        <button
            className={`${styles.listItem} ${isActive ? styles.activeItem : ""}`}
            onClick={onClick}
        >
            <FolderIcon className={styles.listItemIcon} />
            <span className={styles.listItemLabel}>{collection.name}</span>
        </button>
    );
}

interface WorkspaceItemProps {
    readonly workspace: Workspace;
    readonly isActive: boolean;
    readonly onClick: () => void;
}

function WorkspaceItem({ workspace, isActive, onClick }: WorkspaceItemProps) {
    const color = getColorFromId(workspace.id);
    const initials = getInitials(workspace.name);
    return (
        <button
            className={`${styles.listItem} ${isActive ? styles.activeItem : ""}`}
            onClick={onClick}
        >
            <Avatar.Root className={styles.listItemAvatar} style={{ backgroundColor: color }}>
                <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar.Root>
            <span className={styles.listItemLabel}>{workspace.name}</span>
        </button>
    );
}

interface PanelHeaderProps {
    readonly workspace: Workspace | null;
    readonly isDocked: boolean;
    readonly onDockChange: (docked: boolean) => void;
    readonly onClose: () => void;
}

function PanelHeader({ workspace, isDocked, onDockChange, onClose }: PanelHeaderProps) {
    const avatarColor = workspace ? getColorFromId(workspace.id) : "var(--color-primary)";
    const avatarInitials = workspace ? getInitials(workspace.name) : "…";
    return (
        <div className={styles.header}>
            <div className={styles.workspaceInfo}>
                <Avatar.Root
                    className={styles.workspaceAvatar}
                    style={{ backgroundColor: avatarColor }}
                >
                    <Avatar.Fallback>{avatarInitials}</Avatar.Fallback>
                </Avatar.Root>
                <span className={styles.workspaceName}>{workspace?.name ?? "…"}</span>
            </div>
            <div className={styles.headerButtons}>
                <button
                    className={`${styles.iconButton} ${isDocked ? styles.pinned : ""}`}
                    onClick={() => onDockChange(!isDocked)}
                    title={isDocked ? "Unpin panel" : "Pin panel"}
                    aria-label={isDocked ? "Unpin panel" : "Pin panel"}
                >
                    <PinIcon className={styles.icon} />
                </button>
                <button
                    className={styles.iconButton}
                    onClick={onClose}
                    title="Close panel"
                    aria-label="Close panel"
                >
                    <XIcon className={styles.icon} />
                </button>
            </div>
        </div>
    );
}

interface LevelActionsProps {
    readonly label: string;
    readonly sortAsc: boolean;
    readonly onToggleSort: () => void;
    readonly onUp?: () => void;
    readonly creating?: boolean;
    readonly onCreate?: () => void;
    readonly createLabel?: string;
}

function LevelActions({
    label,
    sortAsc,
    onToggleSort,
    onUp,
    creating,
    onCreate,
    createLabel,
}: LevelActionsProps) {
    return (
        <div className={styles.collectionRow}>
            {onUp && (
                <button
                    className={styles.iconButton}
                    onClick={onUp}
                    title="Go up one level"
                    aria-label="Go up one level"
                >
                    <ChevronLeftIcon className={styles.icon} />
                </button>
            )}
            <span className={styles.collectionName}>{label}</span>
            <div className={styles.collectionActions}>
                <button
                    className={styles.iconButton}
                    onClick={onToggleSort}
                    title={sortAsc ? "Oldest first" : "Newest first"}
                    aria-label="Toggle sort direction"
                >
                    <span className={styles.sortChar}>{sortAsc ? "↑" : "↓"}</span>
                </button>
                {onCreate && (
                    <button
                        className={styles.iconButton}
                        onClick={onCreate}
                        disabled={creating}
                        title={createLabel}
                        aria-label={createLabel}
                    >
                        <PlusIcon className={styles.icon} />
                    </button>
                )}
            </div>
        </div>
    );
}

function DashboardNav({ wsId }: { readonly wsId: string }) {
    return (
        <>
            <nav className={styles.navSection}>
                <NavLink
                    to={`/workspaces/${wsId}`}
                    end
                    className={({ isActive }) =>
                        `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                    }
                >
                    <FolderIcon className={styles.navIcon} />
                    Dashboard
                </NavLink>
            </nav>
            <Separator.Root className={styles.separator} />
        </>
    );
}

interface SidebarListProps {
    readonly view: SidebarView;
    readonly filteredDrawings: Drawing[];
    readonly filteredCollections: Collection[];
    readonly filteredWorkspaces: Workspace[];
    readonly drawingId: string;
    readonly browsingWsId: string;
    readonly browsingColId: string;
    readonly activeColId: string;
    readonly activeWsId: string;
    readonly onSelectCollection: (col: Collection) => void;
    readonly onSelectWorkspace: (ws: Workspace) => void;
}

function SidebarList({
    view,
    filteredDrawings,
    filteredCollections,
    filteredWorkspaces,
    drawingId,
    browsingWsId,
    browsingColId,
    activeColId,
    activeWsId,
    onSelectCollection,
    onSelectWorkspace,
}: SidebarListProps) {
    return (
        <ScrollArea.Root className={styles.scrollArea}>
            <ScrollArea.Viewport className={styles.scrollViewport}>
                {view === "drawings" &&
                    filteredDrawings.map((drawing) => (
                        <DrawingItem
                            key={drawing.id}
                            drawing={drawing}
                            isActive={drawing.id === drawingId}
                            wsId={browsingWsId}
                            colId={browsingColId}
                        />
                    ))}
                {view === "collections" &&
                    filteredCollections.map((col) => (
                        <CollectionItem
                            key={col.id}
                            collection={col}
                            isActive={col.id === activeColId}
                            onClick={() => onSelectCollection(col)}
                        />
                    ))}
                {view === "workspaces" &&
                    filteredWorkspaces.map((ws) => (
                        <WorkspaceItem
                            key={ws.id}
                            workspace={ws}
                            isActive={ws.id === activeWsId}
                            onClick={() => onSelectWorkspace(ws)}
                        />
                    ))}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className={styles.scrollbar}>
                <ScrollArea.Thumb className={styles.scrollThumb} />
            </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    );
}

// ─── useSidebarData ───────────────────────────────────────────────────────────

interface SidebarDataResult {
    readonly collectionsList: Collection[];
    readonly workspacesList: Workspace[];
    readonly creatingCollection: boolean;
    readonly creatingWorkspace: boolean;
    readonly handleCreateCollection: () => Promise<void>;
    readonly handleCreateWorkspace: () => Promise<void>;
}

function useSidebarData(view: SidebarView, browsingWsId: string): SidebarDataResult {
    const [collectionsList, setCollectionsList] = useState<Collection[]>([]);
    const [collectionsLoadedFor, setCollectionsLoadedFor] = useState<string | null>(null);
    const [workspacesList, setWorkspacesList] = useState<Workspace[]>([]);
    const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
    const [creatingCollection, setCreatingCollection] = useState(false);
    const [creatingWorkspace, setCreatingWorkspace] = useState(false);

    useEffect(() => {
        if (view !== "collections" || collectionsLoadedFor === browsingWsId) return;
        void listCollections(browsingWsId).then((cols) => {
            setCollectionsList(cols);
            setCollectionsLoadedFor(browsingWsId);
        });
    }, [view, browsingWsId, collectionsLoadedFor]);

    useEffect(() => {
        if (view !== "workspaces" || workspacesLoaded) return;
        void listWorkspaces().then((wss) => {
            setWorkspacesList(wss);
            setWorkspacesLoaded(true);
        });
    }, [view, workspacesLoaded]);

    async function handleCreateCollection() {
        if (creatingCollection) return;
        setCreatingCollection(true);
        try {
            const name = nextCollectionName(collectionsList.map((c) => c.name));
            const col = await createCollection(browsingWsId, name, null);
            setCollectionsList((prev) => [...prev, col]);
        } finally {
            setCreatingCollection(false);
        }
    }

    async function handleCreateWorkspace() {
        if (creatingWorkspace) return;
        setCreatingWorkspace(true);
        try {
            const name = nextWorkspaceName(workspacesList.map((w) => w.name));
            const ws = await createWorkspace(name, null);
            setWorkspacesList((prev) => [...prev, ws]);
        } finally {
            setCreatingWorkspace(false);
        }
    }

    return {
        collectionsList,
        workspacesList,
        creatingCollection,
        creatingWorkspace,
        handleCreateCollection,
        handleCreateWorkspace,
    };
}

// ─── useFilteredLists ─────────────────────────────────────────────────────────

interface FilteredLists {
    readonly filteredDrawings: Drawing[];
    readonly filteredCollections: Collection[];
    readonly filteredWorkspaces: Workspace[];
}

function useFilteredLists(
    drawings: Drawing[],
    collectionsList: Collection[],
    workspacesList: Workspace[],
    searchQuery: string,
    sortAsc: boolean
): FilteredLists {
    const query = searchQuery.toLowerCase();

    const filteredDrawings = drawings
        .filter((d) => d.title.toLowerCase().includes(query))
        .sort((a, b) => {
            const tA = new Date(a.updated_at ?? a.created_at).getTime();
            const tB = new Date(b.updated_at ?? b.created_at).getTime();
            return sortAsc ? tA - tB : tB - tA;
        });

    const filteredCollections = collectionsList
        .filter((c) => c.name.toLowerCase().includes(query))
        .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));

    const filteredWorkspaces = workspacesList
        .filter((w) => w.name.toLowerCase().includes(query))
        .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));

    return { filteredDrawings, filteredCollections, filteredWorkspaces };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLevelLabel(
    view: SidebarView,
    collectionName: string | undefined,
    workspaceName: string | undefined
): string {
    if (view === "drawings") return collectionName ?? "…";
    if (view === "collections") return workspaceName ?? "…";
    return "Workspaces";
}

// ─── useDrawingInfoPanel ──────────────────────────────────────────────────────

function useDrawingInfoPanel(wsId: string, colId: string) {
    const navigate = useNavigate();
    const { collection, drawings, addDrawing, updateDrawingInList } = useCollectionView(
        wsId,
        colId
    );
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetchWorkspace = async () => {
            try {
                const ws = await getWorkspace(wsId);
                if (!cancelled) setWorkspace(ws);
            } catch {
                // Non-critical: workspace name is display-only
            }
        };
        void fetchWorkspace();
        return () => {
            cancelled = true;
        };
    }, [wsId]);

    async function handleCreate() {
        if (creating) return;
        setCreating(true);
        try {
            const title = nextDrawingName(drawings.map((d) => d.title));
            const drawing = await createDrawing(wsId, colId, { title });
            addDrawing(drawing);
            void navigate(`/workspaces/${wsId}/collections/${colId}/drawings/${drawing.id}`);
        } finally {
            setCreating(false);
        }
    }

    return { collection, drawings, workspace, creating, handleCreate, updateDrawingInList };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface CreateConfig {
    readonly onCreate: () => void;
    readonly creating: boolean;
    readonly createLabel: string;
}

function getCreateConfig(
    view: SidebarView,
    drawing: { onCreate: () => void; creating: boolean },
    collection: { onCreate: () => void; creating: boolean },
    workspace: { onCreate: () => void; creating: boolean }
): CreateConfig {
    if (view === "drawings") return { ...drawing, createLabel: "New drawing" };
    if (view === "collections") return { ...collection, createLabel: "New collection" };
    return { ...workspace, createLabel: "New workspace" };
}

// ─── DrawingInfoPanel ─────────────────────────────────────────────────────────

interface DrawingInfoPanelProps {
    readonly wsId: string;
    readonly colId: string;
    readonly drawingId: string;
    readonly isDocked: boolean;
    readonly onDockChange: (docked: boolean) => void;
    readonly onClose: () => void;
    readonly updatedDrawing?: Drawing | null;
}

export const DrawingInfoPanel = forwardRef<HTMLDivElement, DrawingInfoPanelProps>(
    function DrawingInfoPanel(
        { wsId, colId, drawingId, isDocked, onDockChange, onClose, updatedDrawing },
        ref
    ) {
        const [navState, dispatch] = useReducer(navReducer, {
            view: "drawings",
            browsingWsId: wsId,
            browsingColId: colId,
            searchQuery: "",
            sortAsc: false,
        });
        const { view, browsingWsId, browsingColId, searchQuery, sortAsc } = navState;

        // Sync with URL — dispatch is stable, doesn't trigger setState-in-effect rule
        useEffect(() => {
            dispatch({ type: "URL_CHANGED", wsId, colId });
        }, [wsId, colId]);

        const { collection, drawings, workspace, creating, handleCreate, updateDrawingInList } =
            useDrawingInfoPanel(browsingWsId, browsingColId);

        useEffect(() => {
            if (updatedDrawing) updateDrawingInList(updatedDrawing);
        }, [updatedDrawing, updateDrawingInList]);

        const {
            collectionsList,
            workspacesList,
            creatingCollection,
            creatingWorkspace,
            handleCreateCollection,
            handleCreateWorkspace,
        } = useSidebarData(view, browsingWsId);

        const lists = useFilteredLists(
            drawings,
            collectionsList,
            workspacesList,
            searchQuery,
            sortAsc
        );
        const levelLabel = getLevelLabel(view, collection?.name, workspace?.name);
        const createConfig = getCreateConfig(
            view,
            { onCreate: () => void handleCreate(), creating },
            { onCreate: () => void handleCreateCollection(), creating: creatingCollection },
            { onCreate: () => void handleCreateWorkspace(), creating: creatingWorkspace }
        );

        return (
            <div ref={ref} className={`${styles.panel} ${!isDocked ? styles.floating : ""}`}>
                <PanelHeader
                    workspace={workspace}
                    isDocked={isDocked}
                    onDockChange={onDockChange}
                    onClose={onClose}
                />
                <Separator.Root className={styles.separator} />
                <div className={styles.searchWrapper}>
                    <SearchBar
                        value={searchQuery}
                        placeholder="Quick search"
                        onChange={(q) => dispatch({ type: "SET_SEARCH", query: q })}
                    />
                </div>
                {view === "drawings" && <DashboardNav wsId={wsId} />}
                <LevelActions
                    label={levelLabel}
                    sortAsc={sortAsc}
                    onToggleSort={() => dispatch({ type: "TOGGLE_SORT" })}
                    onUp={
                        view !== "workspaces"
                            ? () => dispatch({ type: "GO_UP", urlWsId: wsId })
                            : undefined
                    }
                    onCreate={createConfig.onCreate}
                    creating={createConfig.creating}
                    createLabel={createConfig.createLabel}
                />
                <SidebarList
                    view={view}
                    filteredDrawings={lists.filteredDrawings}
                    filteredCollections={lists.filteredCollections}
                    filteredWorkspaces={lists.filteredWorkspaces}
                    drawingId={drawingId}
                    browsingWsId={browsingWsId}
                    browsingColId={browsingColId}
                    activeColId={colId}
                    activeWsId={wsId}
                    onSelectCollection={(col) => dispatch({ type: "SELECT_COLLECTION", col })}
                    onSelectWorkspace={(ws) => dispatch({ type: "SELECT_WORKSPACE", ws })}
                />
            </div>
        );
    }
);
