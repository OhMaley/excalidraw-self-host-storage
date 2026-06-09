import { useState } from "react";

// Components
import { Dialog, Form } from "radix-ui";

// Types + Services
import type { Workspace } from "@services/workspaces";
import { createWorkspace } from "@services/workspaces";

// Styles
import styles from "./NewWorkspaceDialog.module.scss";

function parseSubmitData(form: HTMLFormElement): { name: string; description: string | null } {
    const data = new FormData(form);
    return {
        name: (data.get("name") as string).trim(),
        description: (data.get("description") as string).trim() || null,
    };
}

interface WorkspaceDialogFormProps {
    readonly loading: boolean;
    readonly serverError: boolean;
    readonly onSubmit: (name: string, description: string | null) => void;
    readonly onCancel: () => void;
}

function WorkspaceDialogForm({
    loading,
    serverError,
    onSubmit,
    onCancel,
}: WorkspaceDialogFormProps) {
    return (
        <Form.Root
            onSubmit={(e) => {
                e.preventDefault();
                const { name, description } = parseSubmitData(e.currentTarget);
                onSubmit(name, description);
            }}
            className={styles.form}
        >
            <Form.Field name="name" className={styles.field}>
                <Form.Label className={styles.label}>
                    Name <span className={styles.required}>*</span>
                </Form.Label>
                <Form.Control asChild>
                    <input
                        className={styles.input}
                        type="text"
                        required
                        maxLength={100}
                        placeholder="e.g. Design Team"
                        disabled={loading}
                    />
                </Form.Control>
                <Form.Message className={styles.message} match="valueMissing">
                    Please enter a name.
                </Form.Message>
            </Form.Field>

            <Form.Field name="description" className={styles.field}>
                <Form.Label className={styles.label}>Description</Form.Label>
                <Form.Control asChild>
                    <textarea
                        className={styles.textarea}
                        maxLength={500}
                        placeholder="What is this workspace for? (optional)"
                        disabled={loading}
                        rows={3}
                    />
                </Form.Control>
            </Form.Field>

            {serverError && (
                <p className={styles.error}>Failed to create workspace. Please try again.</p>
            )}

            <div className={styles.actions}>
                <button type="button" className="btn-md" disabled={loading} onClick={onCancel}>
                    Cancel
                </button>
                <Form.Submit asChild>
                    <button className={`btn-md ${styles.submitButton}`} disabled={loading}>
                        {loading ? "Creating…" : "Create Workspace"}
                    </button>
                </Form.Submit>
            </div>
        </Form.Root>
    );
}

interface NewWorkspaceDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onCreated: (workspace: Workspace) => void;
}

export function NewWorkspaceDialog({ open, onOpenChange, onCreated }: NewWorkspaceDialogProps) {
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(false);

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) setServerError(false);
        onOpenChange(nextOpen);
    }

    function handleSubmit(name: string, description: string | null) {
        setLoading(true);
        setServerError(false);
        createWorkspace(name, description)
            .then((workspace) => {
                onCreated(workspace);
                handleOpenChange(false);
            })
            .catch(() => setServerError(true))
            .finally(() => setLoading(false));
    }

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content className={styles.content}>
                    <Dialog.Title className={styles.title}>New Workspace</Dialog.Title>
                    <Dialog.Description className={styles.subtitle}>
                        Create a team workspace to collaborate on drawings.
                    </Dialog.Description>
                    <WorkspaceDialogForm
                        loading={loading}
                        serverError={serverError}
                        onSubmit={handleSubmit}
                        onCancel={() => handleOpenChange(false)}
                    />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
