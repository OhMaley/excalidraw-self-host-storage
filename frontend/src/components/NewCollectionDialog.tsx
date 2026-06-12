import { NewEntityDialog } from "@components/NewEntityDialog";
import type { Collection } from "@services/collections";
import { createCollection } from "@services/collections";

interface NewCollectionDialogProps {
    readonly wsId: string;
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onCreated: (collection: Collection) => void;
}

export function NewCollectionDialog({
    wsId,
    open,
    onOpenChange,
    onCreated,
}: NewCollectionDialogProps) {
    return (
        <NewEntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title="New Collection"
            subtitle="Group related drawings together."
            namePlaceholder="e.g. Design Specs"
            descriptionPlaceholder="What is this collection for? (optional)"
            submitLabel="Create Collection"
            errorMessage="Failed to create collection. Please try again."
            onSubmit={(name, desc) => createCollection(wsId, name, desc).then(onCreated)}
        />
    );
}
