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
}

export function DrawingTopBar({ title, saveStatus, onToggleSidebar }: DrawingTopBarProps) {
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
            <span className={styles.title}>{title}</span>
            <SaveStatusIcon saveStatus={saveStatus} />
        </div>
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
