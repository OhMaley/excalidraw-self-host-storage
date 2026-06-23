import { useState, useEffect, useId, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { useNavigate } from "react-router-dom";

import { CollectionSelectField } from "@components/CollectionSelectField";
import { FormDialog } from "@components/FormDialog";
import { listWorkspaces, type Workspace } from "@services/workspaces";
import { listCollections, type Collection } from "@services/collections";
import { createDrawing, listDrawings } from "@services/drawings";
import { saveDrawingContent, type ExcalidrawFile } from "@services/storage";
import { nextDrawingName } from "@utils/stringUtils";
import { clearDraft } from "@utils/draftStorage";
import { generateAndUploadThumbnail } from "@utils/thumbnail";

import styles from "./SaveToCollectionDialog.module.scss";

// ─── Local hooks ──────────────────────────────────────────────────────────────

function useDialogWorkspaces(open: boolean) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [wsLoading, setWsLoading] = useState(true);
    const [wsId, setWsId] = useState("");

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const fetchWorkspaces = async () => {
            setWsLoading(true);
            setWorkspaces([]);
            setWsId("");
            try {
                const all = await listWorkspaces();
                if (cancelled) return;
                setWorkspaces(all);
                if (all.length > 0) setWsId(all[0].id);
            } catch {
                if (!cancelled) setWorkspaces([]);
            } finally {
                if (!cancelled) setWsLoading(false);
            }
        };
        void fetchWorkspaces();
        return () => {
            cancelled = true;
        };
    }, [open]);

    return { workspaces, wsLoading, wsId, setWsId };
}

function useDialogCollections(wsId: string) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [colsLoading, setColsLoading] = useState(false);
    const [colId, setColId] = useState("");

    useEffect(() => {
        let cancelled = false;
        const fetchCollections = async () => {
            if (!wsId) {
                setCollections([]);
                setColId("");
                return;
            }
            setColsLoading(true);
            setCollections([]);
            setColId("");
            try {
                const all = await listCollections(wsId);
                if (cancelled) return;
                setCollections(all);
                if (all.length > 0) setColId(all[0].id);
            } catch {
                if (!cancelled) setCollections([]);
            } finally {
                if (!cancelled) setColsLoading(false);
            }
        };
        void fetchCollections();
        return () => {
            cancelled = true;
        };
    }, [wsId]);

    return { collections, colsLoading, colId, setColId };
}

// ─── WorkspaceFields ─────────────────────────────────────────────────────────

interface WorkspaceFieldsProps {
    readonly wsLoading: boolean;
    readonly workspaces: Workspace[];
    readonly showWsSelect: boolean;
    readonly wsId: string;
    readonly onWsChange: (id: string) => void;
    readonly colsLoading: boolean;
    readonly collections: Collection[];
    readonly colId: string;
    readonly onColChange: (id: string) => void;
    readonly disabled: boolean;
    readonly contentEl: HTMLDivElement | null;
}

function WorkspaceFields({
    wsLoading,
    workspaces,
    showWsSelect,
    wsId,
    onWsChange,
    colsLoading,
    collections,
    colId,
    onColChange,
    disabled,
    contentEl,
}: WorkspaceFieldsProps) {
    if (wsLoading) {
        return <p className={styles.hint}>Loading workspaces…</p>;
    }
    if (workspaces.length === 0) {
        return <p className={styles.hint}>Create a workspace first to save drawings.</p>;
    }
    let collectionContent: ReactNode = null;
    if (colsLoading) {
        collectionContent = <p className={styles.hint}>Loading collections…</p>;
    } else if (collections.length === 0 && wsId) {
        collectionContent = <p className={styles.hint}>No collections in this workspace.</p>;
    } else if (collections.length > 0) {
        collectionContent = (
            <CollectionSelectField
                items={collections}
                value={colId}
                onChange={onColChange}
                disabled={disabled}
                contentEl={contentEl}
            />
        );
    }
    return (
        <>
            {showWsSelect && (
                <CollectionSelectField
                    items={workspaces}
                    label="Workspace"
                    value={wsId}
                    onChange={onWsChange}
                    disabled={disabled}
                    contentEl={contentEl}
                />
            )}
            {collectionContent}
        </>
    );
}

// ─── useSaveConfirm ──────────────────────────────────────────────────────────

function useSaveConfirm(
    wsId: string,
    colId: string,
    colsLoading: boolean,
    title: string,
    getContent: () => ExcalidrawFile | null,
    navigate: ReturnType<typeof useNavigate>,
    onOpenChange: (open: boolean) => void
) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const canConfirm = !saving && !colsLoading && !!wsId && !!colId;

    async function handleConfirm() {
        if (!canConfirm) return;
        const content = getContent();
        setSaving(true);
        setError(false);
        try {
            const trimmed = title.trim();
            let finalTitle: string;
            if (trimmed) {
                finalTitle = trimmed;
            } else {
                const existing = await listDrawings(wsId, colId);
                finalTitle = nextDrawingName(existing.map((d) => d.title));
            }
            const drawing = await createDrawing(wsId, colId, { title: finalTitle });
            if (content) {
                await saveDrawingContent(wsId, colId, drawing.id, content);
                void generateAndUploadThumbnail(content, wsId, colId, drawing.id);
            }
            clearDraft();
            onOpenChange(false);
            void navigate(`/workspaces/${wsId}/collections/${colId}/drawings/${drawing.id}`);
        } catch {
            setError(true);
            setSaving(false);
        }
    }

    return { saving, error, canConfirm, handleConfirm, resetError: () => setError(false) };
}

// ─── SaveToCollectionDialog ───────────────────────────────────────────────────

interface SaveToCollectionDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly getContent: () => ExcalidrawFile | null;
}

export function SaveToCollectionDialog({
    open,
    onOpenChange,
    getContent,
}: SaveToCollectionDialogProps) {
    const navigate = useNavigate();
    const { workspaces, wsLoading, wsId, setWsId } = useDialogWorkspaces(open);
    const { collections, colsLoading, colId, setColId } = useDialogCollections(wsId);

    const [title, setTitle] = useState("");
    const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
    const titleId = useId();

    const { saving, error, canConfirm, handleConfirm, resetError } = useSaveConfirm(
        wsId,
        colId,
        colsLoading,
        title,
        getContent,
        navigate,
        onOpenChange
    );

    const showWsSelect = !wsLoading && workspaces.length > 1;

    function close() {
        if (saving) return;
        setTitle("");
        resetError();
        onOpenChange(false);
    }

    return (
        <FormDialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) close();
            }}
            ref={setContentEl}
        >
            <Dialog.Title className={styles.title}>Save to collection</Dialog.Title>
            <Dialog.Description className={styles.subtitle}>
                Choose where to save your drawing.
            </Dialog.Description>

            <div className={styles.form}>
                <div className={styles.field}>
                    <label htmlFor={titleId} className={styles.label}>
                        Title
                    </label>
                    <input
                        id={titleId}
                        type="text"
                        className={styles.input}
                        placeholder="Drawing title (optional)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={saving}
                    />
                </div>

                <WorkspaceFields
                    wsLoading={wsLoading}
                    workspaces={workspaces}
                    showWsSelect={showWsSelect}
                    wsId={wsId}
                    onWsChange={setWsId}
                    colsLoading={colsLoading}
                    collections={collections}
                    colId={colId}
                    onColChange={setColId}
                    disabled={saving}
                    contentEl={contentEl}
                />

                {error && <p className={styles.error}>Failed to save. Please try again.</p>}

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={`btn-md ${styles.cancelButton}`}
                        disabled={saving}
                        onClick={close}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`btn-md ${styles.confirmButton}`}
                        disabled={!canConfirm}
                        onClick={() => void handleConfirm()}
                    >
                        {saving ? "Saving…" : "Save drawing"}
                    </button>
                </div>
            </div>
        </FormDialog>
    );
}
