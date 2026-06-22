import { useState, useRef, useId, type SyntheticEvent } from "react";
import { Dialog, Form } from "radix-ui";

// Components
import { CollectionSelectField } from "@components/CollectionSelectField";
import { DescriptionField } from "@components/DescriptionField";
import { NameFormField } from "@components/NameFormField";
import { TagsInput } from "./TagsInput";

// Services
import type { Drawing, DrawingUpdate } from "@services/drawings";
import type { Collection } from "@services/collections";

// Styles
import styles from "./EditDrawingDialog.module.scss";

interface EditDrawingDialogProps {
    readonly drawing: Drawing | null;
    readonly collections: Collection[];
    readonly availableTags: string[];
    readonly onClose: () => void;
    readonly onConfirm: (drawing: Drawing, updates: DrawingUpdate) => Promise<void>;
}

interface EditDialogContentProps {
    readonly drawing: Drawing;
    readonly collections: Collection[];
    readonly availableTags: string[];
    readonly onClose: () => void;
    readonly onConfirm: (drawing: Drawing, updates: DrawingUpdate) => Promise<void>;
}

interface TagsFieldProps {
    readonly value: string[];
    readonly suggestions: string[];
    readonly loading: boolean;
    readonly onChange: (tags: string[]) => void;
}

interface FormActionsProps {
    readonly loading: boolean;
    readonly serverError: boolean;
    readonly onCancel: () => void;
}

function useEditDialogState(
    drawing: Drawing,
    onConfirm: (drawing: Drawing, updates: DrawingUpdate) => Promise<void>,
    onClose: () => void
) {
    const [title, setTitle] = useState(drawing.title);
    const [description, setDescription] = useState(drawing.description ?? "");
    const [tags, setTags] = useState<string[]>(drawing.tags);
    const [collectionId, setCollectionId] = useState(drawing.collection_id);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(false);

    function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        const updates: DrawingUpdate = {};
        const trimmedTitle = title.trim();
        if (trimmedTitle !== drawing.title) updates.title = trimmedTitle;
        const trimmedDesc = description.trim() || null;
        if (trimmedDesc !== drawing.description) updates.description = trimmedDesc;
        const tagsChanged =
            tags.length !== drawing.tags.length || tags.some((t, i) => t !== drawing.tags[i]);
        if (tagsChanged) updates.tags = tags;
        if (collectionId !== drawing.collection_id) updates.collection_id = collectionId;
        if (Object.keys(updates).length === 0) {
            onClose();
            return;
        }
        setLoading(true);
        setServerError(false);
        onConfirm(drawing, updates)
            .then(() => onClose())
            .catch(() => {
                setServerError(true);
                setLoading(false);
            });
    }

    return {
        title,
        description,
        tags,
        collectionId,
        loading,
        serverError,
        setTitle,
        setDescription,
        setTags,
        setCollectionId,
        handleSubmit,
    };
}

function TagsField({ value, suggestions, loading, onChange }: TagsFieldProps) {
    const tagsInputId = useId();
    return (
        <div className={styles.field}>
            <label htmlFor={tagsInputId} className={styles.label}>
                Tags
            </label>
            <TagsInput
                inputId={tagsInputId}
                value={value}
                onChange={onChange}
                suggestions={suggestions}
                disabled={loading}
                placeholder="Add tags…"
            />
        </div>
    );
}

function FormActions({ loading, serverError, onCancel }: FormActionsProps) {
    return (
        <>
            {serverError && (
                <p className={styles.error}>Failed to save changes. Please try again.</p>
            )}
            <div className={styles.actions}>
                <button
                    type="button"
                    className={`btn-md ${styles.cancelButton}`}
                    disabled={loading}
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <Form.Submit asChild>
                    <button className={`btn-md ${styles.saveButton}`} disabled={loading}>
                        {loading ? "Saving…" : "Save"}
                    </button>
                </Form.Submit>
            </div>
        </>
    );
}

function EditDialogContent({
    drawing,
    collections,
    availableTags,
    onClose,
    onConfirm,
}: EditDialogContentProps) {
    const {
        title,
        description,
        tags,
        collectionId,
        loading,
        serverError,
        setTitle,
        setDescription,
        setTags,
        setCollectionId,
        handleSubmit,
    } = useEditDialogState(drawing, onConfirm, onClose);

    const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    return (
        <Dialog.Content
            ref={setContentEl}
            className={styles.content}
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
                e.preventDefault();
                titleInputRef.current?.focus();
            }}
            onCloseAutoFocus={(e) => e.preventDefault()}
        >
            <Dialog.Title className={styles.title}>Edit drawing</Dialog.Title>

            <Form.Root onSubmit={handleSubmit} className={styles.form}>
                <NameFormField
                    fieldName="title"
                    value={title}
                    inputRef={titleInputRef}
                    disabled={loading}
                    onChange={setTitle}
                />

                <DescriptionField
                    maxLength={500}
                    rows={3}
                    placeholder="Optional description…"
                    value={description}
                    onChange={setDescription}
                    disabled={loading}
                />

                <TagsField
                    value={tags}
                    onChange={setTags}
                    suggestions={availableTags}
                    loading={loading}
                />

                {collections.length > 1 && (
                    <CollectionSelectField
                        items={collections}
                        value={collectionId}
                        contentEl={contentEl}
                        disabled={loading}
                        onChange={setCollectionId}
                    />
                )}

                <FormActions loading={loading} serverError={serverError} onCancel={onClose} />
            </Form.Root>
        </Dialog.Content>
    );
}

export function EditDrawingDialog({
    drawing,
    collections,
    availableTags,
    onClose,
    onConfirm,
}: EditDrawingDialogProps) {
    function handleOpenChange(open: boolean) {
        if (!open) onClose();
    }

    return (
        <Dialog.Root open={drawing !== null} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                {drawing && (
                    <EditDialogContent
                        key={drawing.id}
                        drawing={drawing}
                        collections={collections}
                        availableTags={availableTags}
                        onClose={onClose}
                        onConfirm={onConfirm}
                    />
                )}
            </Dialog.Portal>
        </Dialog.Root>
    );
}
