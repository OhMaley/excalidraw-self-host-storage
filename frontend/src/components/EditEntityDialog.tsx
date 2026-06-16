import { useState, useRef, type SyntheticEvent } from "react";
import { Dialog, Form } from "radix-ui";

// Components
import { DescriptionField } from "@components/DescriptionField";
import { NameFormField } from "@components/NameFormField";

// Styles
import styles from "./EditEntityDialog.module.scss";

interface EditableEntity {
    readonly id: string;
    readonly name: string;
    readonly description: string | null;
}

interface EditEntityContentProps<T extends EditableEntity> {
    readonly entity: T;
    readonly title: string;
    readonly onClose: () => void;
    readonly onConfirm: (name: string, description: string | null) => Promise<void>;
}

function EditEntityContent<T extends EditableEntity>({
    entity,
    title,
    onClose,
    onConfirm,
}: EditEntityContentProps<T>) {
    const [name, setName] = useState(entity.name);
    const [description, setDescription] = useState(entity.description ?? "");
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedDesc = description.trim() || null;
        if (trimmedName === entity.name && trimmedDesc === entity.description) {
            onClose();
            return;
        }
        setLoading(true);
        setServerError(false);
        onConfirm(trimmedName, trimmedDesc)
            .then(() => onClose())
            .catch(() => {
                setServerError(true);
                setLoading(false);
            });
    }

    return (
        <Dialog.Content
            className={styles.content}
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
                e.preventDefault();
                nameRef.current?.focus();
            }}
            onCloseAutoFocus={(e) => e.preventDefault()}
        >
            <Dialog.Title className={styles.title}>{title}</Dialog.Title>

            <Form.Root onSubmit={handleSubmit} className={styles.form}>
                <NameFormField
                    value={name}
                    inputRef={nameRef}
                    disabled={loading}
                    onChange={setName}
                />

                <DescriptionField
                    maxLength={500}
                    rows={3}
                    placeholder="Optional description…"
                    value={description}
                    onChange={setDescription}
                    disabled={loading}
                />

                {serverError && (
                    <p className={styles.error}>Failed to save changes. Please try again.</p>
                )}

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={`btn-md ${styles.cancelButton}`}
                        disabled={loading}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <Form.Submit asChild>
                        <button className={`btn-md ${styles.saveButton}`} disabled={loading}>
                            {loading ? "Saving…" : "Save"}
                        </button>
                    </Form.Submit>
                </div>
            </Form.Root>
        </Dialog.Content>
    );
}

interface EditEntityDialogProps<T extends EditableEntity> {
    readonly entity: T | null;
    readonly title: string;
    readonly onClose: () => void;
    readonly onConfirm: (name: string, description: string | null) => Promise<void>;
}

export function EditEntityDialog<T extends EditableEntity>({
    entity,
    title,
    onClose,
    onConfirm,
}: EditEntityDialogProps<T>) {
    return (
        <Dialog.Root
            open={entity !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                {entity && (
                    <EditEntityContent
                        key={entity.id}
                        entity={entity}
                        title={title}
                        onClose={onClose}
                        onConfirm={onConfirm}
                    />
                )}
            </Dialog.Portal>
        </Dialog.Root>
    );
}
