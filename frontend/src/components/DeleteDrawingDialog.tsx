import { AlertDialog } from "radix-ui";

// Services
import type { Drawing } from "@services/drawings";

// Styles
import styles from "./DeleteDrawingDialog.module.scss";

interface DeleteDrawingDialogProps {
    readonly drawing: Drawing | null;
    readonly onClose: () => void;
    readonly onConfirm: (drawing: Drawing) => void;
}

export function DeleteDrawingDialog({ drawing, onClose, onConfirm }: DeleteDrawingDialogProps) {
    return (
        <AlertDialog.Root
            open={drawing !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <AlertDialog.Portal>
                <AlertDialog.Overlay className={styles.overlay} />
                <AlertDialog.Content
                    className={styles.content}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault(); // Stops Radix from locking focus back to a dead trigger
                    }}
                >
                    <AlertDialog.Title className={styles.title}>Delete drawing?</AlertDialog.Title>
                    <AlertDialog.Description className={styles.description}>
                        &ldquo;{drawing?.title ?? ""}&rdquo; will be permanently deleted. This
                        action cannot be undone.
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
                                onClick={() => {
                                    if (drawing) onConfirm(drawing);
                                }}
                            >
                                Delete
                            </button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
