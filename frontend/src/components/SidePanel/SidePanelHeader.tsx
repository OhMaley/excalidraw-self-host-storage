import type { ReactNode } from "react";
import { Separator } from "radix-ui";
import { PanelHeaderActions } from "./PanelHeaderActions";
import styles from "./SidePanel.module.scss";

interface SidePanelHeaderProps {
    readonly title: ReactNode;
    readonly isDocked: boolean;
    readonly onDockChange: (docked: boolean) => void;
    readonly onClose: () => void;
    readonly closeLabel: string;
}

export function SidePanelHeader({
    title,
    isDocked,
    onDockChange,
    onClose,
    closeLabel,
}: SidePanelHeaderProps) {
    return (
        <>
            <div className={styles.header}>
                {title}
                <PanelHeaderActions
                    isDocked={isDocked}
                    onDockChange={onDockChange}
                    onClose={onClose}
                    closeLabel={closeLabel}
                />
            </div>
            <Separator.Root className={styles.separator} />
        </>
    );
}
