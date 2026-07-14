import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { SidePanelHeader } from "./SidePanelHeader";
import styles from "./SidePanel.module.scss";

export interface SidePanelProps {
    readonly side: "left" | "right";
    readonly width: CSSProperties["width"];
    readonly isDocked: boolean;
    readonly onDockChange: (docked: boolean) => void;
    readonly onClose: () => void;
    readonly closeLabel: string;
    readonly title: ReactNode;
    readonly search?: ReactNode;
    readonly footer?: ReactNode;
    readonly children: ReactNode;
}

// Shell for a docked/floating side panel: a header (title + pin/close
// actions), a separator, an optional search bar, a scrollable content area,
// and an optional footer. Used for both the drawing info sidebar and the
// library panel.
export const SidePanel = forwardRef<HTMLDivElement, SidePanelProps>(function SidePanel(
    { side, width, isDocked, onDockChange, onClose, closeLabel, title, search, footer, children },
    ref
) {
    return (
        <div
            ref={ref}
            className={`${styles.panel} ${styles[side]} ${!isDocked ? styles.floating : ""}`}
            style={{ width }}
        >
            <SidePanelHeader
                title={title}
                isDocked={isDocked}
                onDockChange={onDockChange}
                onClose={onClose}
                closeLabel={closeLabel}
            />
            {search && <div className={styles.searchWrapper}>{search}</div>}
            {children}
            {footer}
        </div>
    );
});
