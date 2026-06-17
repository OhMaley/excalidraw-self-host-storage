import { DeleteConfirmDialog } from "@components/DeleteConfirmDialog";
import type { WorkspaceMember } from "@services/members";
import styles from "@components/DeleteConfirmDialog.module.scss";

interface TransferOwnershipDialogProps {
    readonly member: WorkspaceMember | null;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
}

export function TransferOwnershipDialog({
    member,
    onClose,
    onConfirm,
}: TransferOwnershipDialogProps) {
    return (
        <DeleteConfirmDialog
            open={member !== null}
            title="Transfer ownership?"
            description={
                <>
                    <strong className={styles.entityName}>{member?.user.name}</strong> will become
                    the owner of this workspace. You will be demoted to admin and cannot undo this
                    yourself.
                </>
            }
            confirmLabel="Transfer"
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
