import { DeleteConfirmDialog } from "@components/DeleteConfirmDialog";
import type { Workspace } from "@services/workspaces";
import styles from "@components/DeleteConfirmDialog.module.scss";

interface DeleteWorkspaceDialogProps {
    readonly workspace: Workspace | null;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
}

export function DeleteWorkspaceDialog({
    workspace,
    onClose,
    onConfirm,
}: DeleteWorkspaceDialogProps) {
    return (
        <DeleteConfirmDialog
            open={workspace !== null}
            title="Delete workspace?"
            description={
                <>
                    <strong className={styles.entityName}>{workspace?.name}</strong> and all its
                    collections and drawings will be permanently deleted. This action cannot be
                    undone.
                </>
            }
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
