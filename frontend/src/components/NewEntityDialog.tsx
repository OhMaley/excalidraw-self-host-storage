import { useState } from "react";
import { Dialog, Form } from "radix-ui";

// Components
import { DescriptionField } from "@components/DescriptionField";

// Styles
import styles from "./NewEntityDialog.module.scss";

function parseSubmitData(form: HTMLFormElement): { name: string; description: string | null } {
    const data = new FormData(form);
    return {
        name: (data.get("name") as string).trim(),
        description: (data.get("description") as string).trim() || null,
    };
}

interface EntityDialogFormProps {
    readonly loading: boolean;
    readonly serverError: boolean;
    readonly errorMessage: string;
    readonly namePlaceholder: string;
    readonly descriptionPlaceholder: string;
    readonly submitLabel: string;
    readonly onSubmit: (name: string, description: string | null) => void;
    readonly onCancel: () => void;
}

function EntityDialogForm({
    loading,
    serverError,
    errorMessage,
    namePlaceholder,
    descriptionPlaceholder,
    submitLabel,
    onSubmit,
    onCancel,
}: EntityDialogFormProps) {
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
                        placeholder={namePlaceholder}
                        disabled={loading}
                    />
                </Form.Control>
                <Form.Message className={styles.message} match="valueMissing">
                    Please enter a name.
                </Form.Message>
            </Form.Field>

            <DescriptionField
                maxLength={500}
                placeholder={descriptionPlaceholder}
                rows={3}
                disabled={loading}
            />

            {serverError && <p className={styles.error}>{errorMessage}</p>}

            <div className={styles.actions}>
                <button type="button" className="btn-md" disabled={loading} onClick={onCancel}>
                    Cancel
                </button>
                <Form.Submit asChild>
                    <button className={`btn-md ${styles.submitButton}`} disabled={loading}>
                        {loading ? "Creating…" : submitLabel}
                    </button>
                </Form.Submit>
            </div>
        </Form.Root>
    );
}

interface NewEntityDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly title: string;
    readonly subtitle: string;
    readonly namePlaceholder: string;
    readonly descriptionPlaceholder: string;
    readonly submitLabel: string;
    readonly errorMessage: string;
    readonly onSubmit: (name: string, description: string | null) => Promise<void>;
}

export function NewEntityDialog({
    open,
    onOpenChange,
    title,
    subtitle,
    namePlaceholder,
    descriptionPlaceholder,
    submitLabel,
    errorMessage,
    onSubmit,
}: NewEntityDialogProps) {
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(false);
    const close = () => {
        setServerError(false);
        onOpenChange(false);
    };

    function handleSubmit(name: string, description: string | null) {
        setLoading(true);
        setServerError(false);
        onSubmit(name, description)
            .then(close)
            .catch(() => setServerError(true))
            .finally(() => setLoading(false));
    }

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(o) => {
                if (!o) close();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content className={styles.content}>
                    <Dialog.Title className={styles.title}>{title}</Dialog.Title>
                    <Dialog.Description className={styles.subtitle}>{subtitle}</Dialog.Description>
                    <EntityDialogForm
                        loading={loading}
                        serverError={serverError}
                        errorMessage={errorMessage}
                        namePlaceholder={namePlaceholder}
                        descriptionPlaceholder={descriptionPlaceholder}
                        submitLabel={submitLabel}
                        onSubmit={handleSubmit}
                        onCancel={close}
                    />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
