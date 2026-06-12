import { DeleteConfirmDialog } from "@components/DeleteConfirmDialog";
import type { Collection } from "@services/collections";

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
                    &ldquo;{collection?.name ?? ""}&rdquo; and all its drawings will be permanently
                    deleted. This action cannot be undone.
                </>
            }
            onClose={onClose}
            onConfirm={() => {
                if (collection) onConfirm(collection);
            }}
        />
    );
}
