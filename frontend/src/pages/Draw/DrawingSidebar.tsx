import { forwardRef, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Avatar, ScrollArea, Separator, Tooltip } from "radix-ui";

import PinIcon from "@assets/icons/pin.svg?react";
import XIcon from "@assets/icons/x.svg?react";
import FolderIcon from "@assets/icons/folder.svg?react";
import PlusIcon from "@assets/icons/plus.svg?react";

import { SearchBar } from "@components/SearchSortToolbar";
import { useCollectionView } from "@hooks/useCollectionView";
import { getWorkspace, type Workspace } from "@services/workspaces";
import { createDrawing, type Drawing } from "@services/drawings";
import { getInitials, nextDrawingName } from "@utils/stringUtils";
import { getColorFromId } from "@utils/colorUtils";
import { relativeTime } from "@utils/timeUtils";

import styles from "./DrawingSidebar.module.scss";

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
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <NavLink
                    to={to}
                    className={`${styles.drawingItem} ${isActive ? styles.activeItem : ""}`}
                >
                    <div className={styles.thumbnail} />
                    <div className={styles.drawingInfo}>
                        <div className={styles.drawingTitleWrapper}>
                            <p className={styles.drawingTitle}>{drawing.title}</p>
                        </div>
                        <div className={styles.drawingMeta}>
                            <p className={styles.drawingAuthor}>by {author}</p>
                            <p className={styles.drawingTime}>{time}</p>
                        </div>
                    </div>
                </NavLink>
            </Tooltip.Trigger>
            {drawing.description && (
                <Tooltip.Portal>
                    <Tooltip.Content className={styles.tooltip} side="right" sideOffset={8}>
                        {drawing.description}
                        <Tooltip.Arrow className={styles.tooltipArrow} />
                    </Tooltip.Content>
                </Tooltip.Portal>
            )}
        </Tooltip.Root>
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

interface CollectionActionsProps {
    readonly collectionName: string | undefined;
    readonly sortAsc: boolean;
    readonly onToggleSort: () => void;
    readonly creating: boolean;
    readonly onCreate: () => void;
}

function CollectionActions({
    collectionName,
    sortAsc,
    onToggleSort,
    creating,
    onCreate,
}: CollectionActionsProps) {
    return (
        <div className={styles.collectionRow}>
            <span className={styles.collectionName}>{collectionName ?? "…"}</span>
            <div className={styles.collectionActions}>
                <button
                    className={styles.iconButton}
                    onClick={onToggleSort}
                    title={sortAsc ? "Oldest first" : "Newest first"}
                    aria-label="Toggle sort direction"
                >
                    <span className={styles.sortChar}>{sortAsc ? "↑" : "↓"}</span>
                </button>
                <button
                    className={styles.iconButton}
                    onClick={onCreate}
                    disabled={creating}
                    title="New drawing"
                    aria-label="New drawing"
                >
                    <PlusIcon className={styles.icon} />
                </button>
            </div>
        </div>
    );
}

// ─── DrawingInfoPanel ─────────────────────────────────────────────────────────

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
        const [searchQuery, setSearchQuery] = useState("");
        const [sortAsc, setSortAsc] = useState(false);
        const { collection, drawings, workspace, creating, handleCreate, updateDrawingInList } =
            useDrawingInfoPanel(wsId, colId);

        useEffect(() => {
            if (updatedDrawing) updateDrawingInList(updatedDrawing);
        }, [updatedDrawing, updateDrawingInList]);

        const filtered = drawings
            .filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
                const tA = new Date(a.updated_at ?? a.created_at).getTime();
                const tB = new Date(b.updated_at ?? b.created_at).getTime();
                return sortAsc ? tA - tB : tB - tA;
            });

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
                        onChange={setSearchQuery}
                    />
                </div>

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

                <CollectionActions
                    collectionName={collection?.name}
                    sortAsc={sortAsc}
                    onToggleSort={() => setSortAsc((asc) => !asc)}
                    creating={creating}
                    onCreate={() => void handleCreate()}
                />

                <ScrollArea.Root className={styles.scrollArea}>
                    <ScrollArea.Viewport className={styles.scrollViewport}>
                        {filtered.map((drawing) => (
                            <DrawingItem
                                key={drawing.id}
                                drawing={drawing}
                                isActive={drawing.id === drawingId}
                                wsId={wsId}
                                colId={colId}
                            />
                        ))}
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar orientation="vertical" className={styles.scrollbar}>
                        <ScrollArea.Thumb className={styles.scrollThumb} />
                    </ScrollArea.Scrollbar>
                </ScrollArea.Root>
            </div>
        );
    }
);
