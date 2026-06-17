import { DeleteConfirmDialog } from "@components/DeleteConfirmDialog";
import type { Collection } from "@services/collections";
import styles from "@components/DeleteConfirmDialog.module.scss";

interface DeleteCollectionDialogProps {
    readonly collection: Collection | null;
    readonly onClose: () => void;
    readonly onConfirm: (collection: Collection) => void;
}

export function DeleteCollectionDialog({
    collection,
    onClose,
    onConfirm,
}: DeleteCollectionDialogProps) {
    return (
        <DeleteConfirmDialog
            open={collection !== null}
            title="Delete collection?"
            description={
                <>
                    <strong className={styles.entityName}>{collection?.name ?? ""}</strong> and all
                    its drawings will be permanently deleted. This action cannot be undone.
                </>
            }
            onClose={onClose}
            onConfirm={() => {
                if (collection) onConfirm(collection);
            }}
        />
    );
}
