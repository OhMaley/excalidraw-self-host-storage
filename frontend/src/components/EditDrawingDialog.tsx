import { useState, useRef, useId, type SyntheticEvent } from "react";
import { Dialog, Form, Select } from "radix-ui";

// Components
import { DescriptionField } from "@components/DescriptionField";
import { TagsInput } from "@components/TagsInput";

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

interface CollectionSelectFieldProps {
    readonly collections: Collection[];
    readonly collectionId: string;
    readonly contentEl: HTMLDivElement | null;
    readonly loading: boolean;
    readonly onChange: (id: string) => void;
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

function CollectionSelectField({
    collections,
    collectionId,
    contentEl,
    loading,
    onChange,
}: CollectionSelectFieldProps) {
    const collectionTriggerId = useId();
    const collectionLabelId = useId();
    const selectedName = collections.find((c) => c.id === collectionId)?.name ?? "";
    return (
        <div className={styles.field}>
            <label id={collectionLabelId} htmlFor={collectionTriggerId} className={styles.label}>
                Collection
            </label>
            <Select.Root value={collectionId} onValueChange={onChange} disabled={loading}>
                <Select.Trigger
                    id={collectionTriggerId}
                    aria-labelledby={collectionLabelId}
                    className={styles.selectTrigger}
                >
                    <Select.Value>{selectedName}</Select.Value>
                    <Select.Icon className={styles.selectIcon}>▾</Select.Icon>
                </Select.Trigger>
                <Select.Portal container={contentEl}>
                    <Select.Content
                        className={styles.selectContent}
                        position="popper"
                        sideOffset={4}
                    >
                        <Select.Viewport>
                            {collections.map((col) => (
                                <Select.Item
                                    key={col.id}
                                    value={col.id}
                                    className={styles.selectItem}
                                >
                                    <Select.ItemText>{col.name}</Select.ItemText>
                                </Select.Item>
                            ))}
                        </Select.Viewport>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>
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
            onOpenAutoFocus={(e) => {
                e.preventDefault();
                titleInputRef.current?.focus();
            }}
            onCloseAutoFocus={(e) => e.preventDefault()}
        >
            <Dialog.Title className={styles.title}>Edit drawing</Dialog.Title>

            <Form.Root onSubmit={handleSubmit} className={styles.form}>
                <Form.Field name="title" className={styles.field}>
                    <Form.Label className={styles.label}>
                        Name <span className={styles.required}>*</span>
                    </Form.Label>
                    <Form.Control asChild>
                        <input
                            ref={titleInputRef}
                            className={styles.input}
                            type="text"
                            required
                            maxLength={100}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={loading}
                        />
                    </Form.Control>
                    <Form.Message className={styles.message} match="valueMissing">
                        Please enter a name.
                    </Form.Message>
                </Form.Field>

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
                        collections={collections}
                        collectionId={collectionId}
                        contentEl={contentEl}
                        loading={loading}
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
