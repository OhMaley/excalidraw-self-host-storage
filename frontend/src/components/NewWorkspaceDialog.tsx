import { NewEntityDialog } from "@components/NewEntityDialog";
import type { Workspace } from "@services/workspaces";
import { createWorkspace } from "@services/workspaces";

interface NewWorkspaceDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onCreated: (workspace: Workspace) => void;
}

export function NewWorkspaceDialog({ open, onOpenChange, onCreated }: NewWorkspaceDialogProps) {
    return (
        <NewEntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title="New Workspace"
            subtitle="Create a team workspace to collaborate on drawings."
            namePlaceholder="e.g. Design Team"
            descriptionPlaceholder="What is this workspace for? (optional)"
            submitLabel="Create Workspace"
            errorMessage="Failed to create workspace. Please try again."
            onSubmit={(name, desc) => createWorkspace(name, desc).then(onCreated)}
        />
    );
}
