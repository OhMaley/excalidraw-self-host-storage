import { DeleteConfirmDialog } from "@components/DeleteConfirmDialog";
import type { Drawing } from "@services/drawings";

interface DeleteDrawingDialogProps {
    readonly drawing: Drawing | null;
    readonly onClose: () => void;
    readonly onConfirm: (drawing: Drawing) => void;
}

export function DeleteDrawingDialog({ drawing, onClose, onConfirm }: DeleteDrawingDialogProps) {
    return (
        <DeleteConfirmDialog
            open={drawing !== null}
            title="Delete drawing?"
            description={
                <>
                    &ldquo;{drawing?.title ?? ""}&rdquo; will be permanently deleted. This action
                    cannot be undone.
                </>
            }
            onClose={onClose}
            onConfirm={() => {
                if (drawing) onConfirm(drawing);
            }}
        />
    );
}
