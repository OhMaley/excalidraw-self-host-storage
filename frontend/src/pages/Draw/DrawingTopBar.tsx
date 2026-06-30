import { useState, useEffect, useRef } from "react";
import { Tooltip } from "radix-ui";
import styles from "./DrawingTopBar.module.scss";

import PanelLeftIcon from "@assets/icons/panel-left.svg?react";
import CheckCircleIcon from "@assets/icons/check-circle.svg?react";
import AlertCircleIcon from "@assets/icons/alert-circle.svg?react";
import LoaderCircleIcon from "@assets/icons/loader-circle.svg?react";

import type { SaveStatus } from "@hooks/useStorage";

interface DrawingTopBarProps {
    readonly title: string;
    readonly saveStatus: SaveStatus;
    readonly onToggleSidebar: () => void;
    readonly onTitleChange?: (title: string) => void;
}

export function DrawingTopBar({
    title,
    saveStatus,
    onToggleSidebar,
    onTitleChange,
}: DrawingTopBarProps) {
    return (
        <div className={styles.topBar}>
            <button
                className={styles.toggleButton}
                onClick={onToggleSidebar}
                title="Toggle drawing info"
                aria-label="Toggle drawing info sidebar"
            >
                <PanelLeftIcon className={styles.icon} />
            </button>
            {onTitleChange ? (
                <EditableTitle title={title} onTitleChange={onTitleChange} />
            ) : (
                <ReadOnlyTitle title={title} />
            )}
            <div className={styles.saveIconOverlay}>
                <SaveStatusIcon saveStatus={saveStatus} />
            </div>
        </div>
    );
}

function TitleTooltipPortal({ title }: { readonly title: string }) {
    return (
        <Tooltip.Portal>
            <Tooltip.Content className={styles.tooltip} side="bottom" sideOffset={8}>
                {title}
                <Tooltip.Arrow className={styles.tooltipArrow} />
            </Tooltip.Content>
        </Tooltip.Portal>
    );
}

function ReadOnlyTitle({ title }: { readonly title: string }) {
    const titleRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        const el = titleRef.current;
        if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
    }, [title]);

    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <span ref={titleRef} className={styles.title}>
                    {title}
                </span>
            </Tooltip.Trigger>
            {isTruncated && <TitleTooltipPortal title={title} />}
        </Tooltip.Root>
    );
}

interface EditableTitleProps {
    readonly title: string;
    readonly onTitleChange: (title: string) => void;
}

function EditableTitle({ title, onTitleChange }: EditableTitleProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);
    const titleRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        if (isEditing) inputRef.current?.select();
    }, [isEditing]);

    useEffect(() => {
        if (!isEditing) {
            const el = titleRef.current;
            if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
        }
    }, [title, isEditing]);

    function startEditing() {
        setDraft(title);
        setIsEditing(true);
    }

    function commit() {
        const trimmed = draft.trim();
        setIsEditing(false);
        if (trimmed && trimmed !== title) {
            onTitleChange(trimmed);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setIsEditing(false);
    }

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                className={styles.titleInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <span
                    ref={titleRef}
                    className={styles.title}
                    onClick={startEditing}
                    title={isTruncated ? undefined : "Click to rename"}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") startEditing();
                    }}
                >
                    {title}
                </span>
            </Tooltip.Trigger>
            {isTruncated && <TitleTooltipPortal title={title} />}
        </Tooltip.Root>
    );
}

function SaveStatusIcon({ saveStatus }: { readonly saveStatus: SaveStatus }) {
    if (saveStatus === "idle") return null;
    if (saveStatus === "saving")
        return (
            <LoaderCircleIcon
                className={`${styles.icon} ${styles.spinning}`}
                aria-label="Saving…"
            />
        );
    if (saveStatus === "saved")
        return <CheckCircleIcon className={`${styles.icon} ${styles.saved}`} aria-label="Saved" />;
    return (
        <AlertCircleIcon className={`${styles.icon} ${styles.error}`} aria-label="Save failed" />
    );
}
