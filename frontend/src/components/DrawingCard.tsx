import { NavLink } from "react-router-dom";
import { DropdownMenu } from "radix-ui";

// Services
import type { Drawing } from "@services/drawings";

// Icons
import DotsIcon from "../assets/icons/dots.svg?react";

// Utils
import { relativeTime } from "@utils/timeUtils";
import { recordVisit } from "@utils/visitedDrawings";

// Styles
import styles from "./DrawingCard.module.scss";

interface DrawingCardProps {
    readonly drawing: Drawing;
    readonly to: string;
    readonly visitedAt?: number;
    readonly onRename?: () => void;
    readonly onDelete?: () => void;
}

export function DrawingCard({ drawing, to, visitedAt, onRename, onDelete }: DrawingCardProps) {
    const lastModifiedBy = drawing.updated_by ?? drawing.created_by;
    const timestamp =
        visitedAt !== undefined
            ? relativeTime(new Date(visitedAt).toISOString())
            : relativeTime(drawing.updated_at ?? drawing.created_at);

    return (
        <div className={styles.wrapper}>
            <NavLink to={to} className={styles.card} onClick={() => recordVisit(drawing.id)}>
                <div className={styles.thumbnail}>
                    <span className={styles.timestamp}>{timestamp}</span>
                </div>
                <div className={styles.info}>
                    <p className={styles.title}>{drawing.title}</p>
                    <p className={styles.author}>by {lastModifiedBy.name}</p>
                </div>
            </NavLink>

            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        type="button"
                        className={styles.menuButton}
                        aria-label="Drawing options"
                    >
                        <DotsIcon className={styles.menuButtonIcon} />
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={styles.menuContent} align="end" sideOffset={4}>
                        <DropdownMenu.Item
                            className={styles.menuItem}
                            onSelect={() => onRename?.()}
                        >
                            Rename
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            className={`${styles.menuItem} ${styles.menuItemDelete}`}
                            onSelect={() => onDelete?.()}
                        >
                            Delete
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    );
}
