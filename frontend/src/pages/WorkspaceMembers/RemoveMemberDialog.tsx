import { DeleteConfirmDialog } from "@components/DeleteConfirmDialog";
import type { WorkspaceMember } from "@services/members";
import styles from "@components/DeleteConfirmDialog.module.scss";

interface RemoveMemberDialogProps {
    readonly member: WorkspaceMember | null;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
}

export function RemoveMemberDialog({ member, onClose, onConfirm }: RemoveMemberDialogProps) {
    return (
        <DeleteConfirmDialog
            open={member !== null}
            title="Remove member?"
            description={
                <>
                    <strong className={styles.entityName}>{member?.user.name}</strong> will lose
                    access to this workspace and its collections and drawings.
                </>
            }
            confirmLabel="Remove"
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
