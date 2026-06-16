import { EditEntityDialog } from "@components/EditEntityDialog";
import type { Workspace } from "@services/workspaces";

interface EditWorkspaceDialogProps {
    readonly workspace: Workspace | null;
    readonly onClose: () => void;
    readonly onConfirm: (name: string, description: string | null) => Promise<void>;
}

export function EditWorkspaceDialog({ workspace, onClose, onConfirm }: EditWorkspaceDialogProps) {
    return (
        <EditEntityDialog
            entity={workspace}
            title="Edit workspace"
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
