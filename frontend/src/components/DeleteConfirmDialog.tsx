import type { ReactNode } from "react";
import { AlertDialog } from "radix-ui";
import styles from "./DeleteConfirmDialog.module.scss";

interface DeleteConfirmDialogProps {
    readonly open: boolean;
    readonly title: string;
    readonly description: ReactNode;
    readonly confirmLabel?: string;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
}

export function DeleteConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Delete",
    onClose,
    onConfirm,
}: DeleteConfirmDialogProps) {
    return (
        <AlertDialog.Root
            open={open}
            onOpenChange={(o) => {
                if (!o) onClose();
            }}
        >
            <AlertDialog.Portal>
                <AlertDialog.Overlay className={styles.overlay} />
                <AlertDialog.Content
                    className={styles.content}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
                    <AlertDialog.Description className={styles.description}>
                        {description}
                    </AlertDialog.Description>
                    <div className={styles.actions}>
                        <AlertDialog.Cancel asChild>
                            <button type="button" className={styles.cancelButton}>
                                Cancel
                            </button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <button
                                type="button"
                                className={styles.deleteButton}
                                onClick={onConfirm}
                            >
                                {confirmLabel}
                            </button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
