import { DeleteConfirmDialog } from "@components/DeleteConfirmDialog";

interface LeaveWorkspaceDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
}

export function LeaveWorkspaceDialog({ open, onClose, onConfirm }: LeaveWorkspaceDialogProps) {
    return (
        <DeleteConfirmDialog
            open={open}
            title="Leave workspace?"
            description="You will lose access to this workspace and its collections and drawings until someone adds you back."
            confirmLabel="Leave"
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
