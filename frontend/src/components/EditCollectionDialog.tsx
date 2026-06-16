import { EditEntityDialog } from "@components/EditEntityDialog";
import type { Collection } from "@services/collections";

interface EditCollectionDialogProps {
    readonly collection: Collection | null;
    readonly onClose: () => void;
    readonly onConfirm: (name: string, description: string | null) => Promise<void>;
}

export function EditCollectionDialog({
    collection,
    onClose,
    onConfirm,
}: EditCollectionDialogProps) {
    return (
        <EditEntityDialog
            entity={collection}
            title="Edit collection"
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
