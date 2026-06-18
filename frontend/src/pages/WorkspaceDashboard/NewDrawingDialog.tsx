import { useState } from "react";
import { Dialog } from "radix-ui";

import { CollectionSelectField } from "@components/CollectionSelectField";
import type { Collection } from "@services/collections";
import styles from "./NewDrawingDialog.module.scss";

interface NewDrawingDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly collections: Collection[];
    readonly onConfirm: (colId: string) => Promise<void>;
}

export function NewDrawingDialog({
    open,
    onOpenChange,
    collections,
    onConfirm,
}: NewDrawingDialogProps) {
    const [colId, setColId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);

    const effectiveColId = colId || collections[0]?.id || "";

    function close() {
        if (loading) return;
        setColId("");
        setError(false);
        onOpenChange(false);
    }

    function handleOpenChange(isOpen: boolean) {
        if (!isOpen) close();
    }

    async function handleConfirm() {
        if (!effectiveColId) return;
        setLoading(true);
        setError(false);
        try {
            await onConfirm(effectiveColId);
            onOpenChange(false);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content
                    ref={setContentEl}
                    className={styles.content}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <Dialog.Title className={styles.title}>Start drawing</Dialog.Title>
                    <Dialog.Description className={styles.subtitle}>
                        Choose which collection to save your drawing in.
                    </Dialog.Description>
                    <div className={styles.form}>
                        <CollectionSelectField
                            collections={collections}
                            value={effectiveColId}
                            onChange={setColId}
                            disabled={loading}
                            contentEl={contentEl}
                        />
                        {error && (
                            <p className={styles.error}>
                                Failed to create drawing. Please try again.
                            </p>
                        )}
                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={`btn-md ${styles.cancelButton}`}
                                disabled={loading}
                                onClick={close}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={`btn-md ${styles.confirmButton}`}
                                disabled={loading || !effectiveColId}
                                onClick={() => void handleConfirm()}
                            >
                                {loading ? "Creating…" : "Start drawing"}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
