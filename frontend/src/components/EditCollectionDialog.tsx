import { useState, useRef, type SyntheticEvent } from "react";
import { Dialog, Form } from "radix-ui";

// Components
import { DescriptionField } from "@components/DescriptionField";
import { NameFormField } from "@components/NameFormField";

// Services
import type { Collection } from "@services/collections";

// Styles
import styles from "./EditCollectionDialog.module.scss";

interface EditCollectionDialogProps {
    readonly collection: Collection | null;
    readonly onClose: () => void;
    readonly onConfirm: (name: string, description: string | null) => Promise<void>;
}

interface EditCollectionContentProps {
    readonly collection: Collection;
    readonly onClose: () => void;
    readonly onConfirm: (name: string, description: string | null) => Promise<void>;
}

function EditCollectionContent({ collection, onClose, onConfirm }: EditCollectionContentProps) {
    const [name, setName] = useState(collection.name);
    const [description, setDescription] = useState(collection.description ?? "");
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedDesc = description.trim() || null;
        if (trimmedName === collection.name && trimmedDesc === collection.description) {
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
            <Dialog.Title className={styles.title}>Edit collection</Dialog.Title>

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

export function EditCollectionDialog({
    collection,
    onClose,
    onConfirm,
}: EditCollectionDialogProps) {
    return (
        <Dialog.Root
            open={collection !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                {collection && (
                    <EditCollectionContent
                        key={collection.id}
                        collection={collection}
                        onClose={onClose}
                        onConfirm={onConfirm}
                    />
                )}
            </Dialog.Portal>
        </Dialog.Root>
    );
}
