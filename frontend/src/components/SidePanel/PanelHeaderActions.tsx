import PinIcon from "@assets/icons/pin.svg?react";
import XIcon from "@assets/icons/x.svg?react";
import styles from "./SidePanel.module.scss";

interface PanelHeaderActionsProps {
    readonly isDocked: boolean;
    readonly onDockChange: (docked: boolean) => void;
    readonly onClose: () => void;
    readonly closeLabel: string;
}

// The pin/unpin + close button pair shown in every SidePanel header.
export function PanelHeaderActions({
    isDocked,
    onDockChange,
    onClose,
    closeLabel,
}: PanelHeaderActionsProps) {
    return (
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
                title={closeLabel}
                aria-label={closeLabel}
            >
                <XIcon className={styles.icon} />
            </button>
        </div>
    );
}
