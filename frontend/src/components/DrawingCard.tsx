import { NavLink } from "react-router-dom";
import { DropdownMenu, Tooltip } from "radix-ui";

// Services
import type { Drawing } from "@services/drawings";

// Components
import { CardMenu, cardMenuStyles } from "@components/CardMenu";

// Icons
import ThrashIcon from "../assets/icons/trash.svg?react";
import PenIcon from "../assets/icons/pencil.svg?react";

// Utils
import { relativeTime } from "@utils/timeUtils";
import { recordVisit } from "@utils/visitedDrawings";
import { getColorFromId } from "@utils/colorUtils";

// Styles
import styles from "./DrawingCard.module.scss";

interface DrawingCardProps {
    readonly drawing: Drawing;
    readonly to: string;
    readonly collectionName?: string;
    readonly collectionColor?: string;
    readonly visitedAt?: number;
    readonly readOnly?: boolean;
    readonly onEdit?: () => void;
    readonly onDelete?: () => void;
}

interface TagRowProps {
    readonly tags: string[];
}

function TagRow({ tags }: TagRowProps) {
    if (tags.length === 0) return null;
    return (
        <div className={styles.tagRow}>
            {tags.slice(0, 2).map((tag) => (
                <span
                    key={tag}
                    className={styles.thumbnailTag}
                    style={{ "--tag-color": getColorFromId(tag) } as React.CSSProperties}
                >
                    {tag}
                </span>
            ))}
            {tags.length > 2 && <span className={styles.thumbnailTagMore}>+{tags.length - 2}</span>}
        </div>
    );
}

interface DrawingCardMenuProps {
    readonly onEdit?: () => void;
    readonly onDelete?: () => void;
}

function DrawingCardMenu({ onEdit, onDelete }: DrawingCardMenuProps) {
    return (
        <CardMenu
            label="Drawing options"
            triggerClassName={styles.menuButton}
            iconClassName={styles.menuButtonIcon}
            contentClassName={cardMenuStyles.content}
        >
            <DropdownMenu.Item className={cardMenuStyles.item} onSelect={() => onEdit?.()}>
                <PenIcon className={cardMenuStyles.itemIcon} />
                Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item
                className={`${cardMenuStyles.item} ${cardMenuStyles.itemDelete}`}
                onSelect={() => onDelete?.()}
            >
                <ThrashIcon className={cardMenuStyles.itemIcon} />
                Delete
            </DropdownMenu.Item>
        </CardMenu>
    );
}

export function DrawingCard({
    drawing,
    to,
    collectionName,
    collectionColor,
    visitedAt,
    readOnly,
    onEdit,
    onDelete,
}: DrawingCardProps) {
    const lastModifiedBy = drawing.updated_by ?? drawing.created_by;
    const timestamp =
        visitedAt !== undefined
            ? relativeTime(new Date(visitedAt).toISOString())
            : relativeTime(drawing.updated_at ?? drawing.created_at);

    return (
        <div className={styles.wrapper}>
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    <NavLink
                        to={to}
                        className={styles.card}
                        onClick={() => recordVisit(drawing.id)}
                    >
                        <div className={styles.thumbnail}>
                            <div className={styles.topLeft}>
                                {collectionName && (
                                    <span
                                        className={styles.collectionTag}
                                        style={
                                            collectionColor
                                                ? ({
                                                      "--collection-color": collectionColor,
                                                  } as React.CSSProperties)
                                                : undefined
                                        }
                                    >
                                        {collectionName}
                                    </span>
                                )}
                                {!readOnly && <TagRow tags={drawing.tags} />}
                            </div>
                            <span className={styles.timestamp}>{timestamp}</span>
                        </div>
                        <div className={styles.info}>
                            <p className={styles.title}>{drawing.title}</p>
                            <p className={styles.author}>by {lastModifiedBy.name}</p>
                        </div>
                    </NavLink>
                </Tooltip.Trigger>
                {drawing.description && (
                    <Tooltip.Portal>
                        <Tooltip.Content className={styles.tooltip} side="bottom" sideOffset={6}>
                            {drawing.description}
                            <Tooltip.Arrow className={styles.tooltipArrow} />
                        </Tooltip.Content>
                    </Tooltip.Portal>
                )}
            </Tooltip.Root>

            {!readOnly && <DrawingCardMenu onEdit={onEdit} onDelete={onDelete} />}
        </div>
    );
}
