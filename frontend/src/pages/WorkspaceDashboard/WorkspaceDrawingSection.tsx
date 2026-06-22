import { DrawingCard } from "@components/DrawingCard";
import { Spinner } from "@components/Spinner";
import { type Drawing } from "@services/drawings";
import styles from "./WorkspaceDrawingSection.module.scss";

interface WorkspaceDrawingSectionProps {
    readonly wsId: string;
    readonly title: string;
    readonly drawings: Drawing[];
    readonly loading: boolean;
    readonly readOnly?: boolean;
    readonly visitedAtMap?: ReadonlyMap<string, number>;
    readonly collectionNameMap?: ReadonlyMap<string, { name: string; color: string }>;
    readonly onDelete?: (drawing: Drawing) => void;
}

export function WorkspaceDrawingSection({
    wsId,
    title,
    drawings,
    loading,
    readOnly,
    visitedAtMap,
    collectionNameMap,
    onDelete,
}: WorkspaceDrawingSectionProps) {
    function renderContent() {
        if (loading)
            return (
                <div className={styles.sectionSpinner}>
                    <Spinner size="1.25rem" />
                </div>
            );
        if (drawings.length === 0) return <p className={styles.emptyHint}>No drawings yet.</p>;
        return (
            <div className={styles.grid}>
                {drawings.map((d) => (
                    <DrawingCard
                        key={d.id}
                        drawing={d}
                        to={`/workspaces/${wsId}/collections/${d.collection_id}/drawings/${d.id}`}
                        wsId={wsId}
                        collectionName={collectionNameMap?.get(d.id)?.name}
                        collectionColor={collectionNameMap?.get(d.id)?.color}
                        visitedAt={visitedAtMap?.get(d.id)}
                        readOnly={readOnly}
                        onDelete={readOnly ? undefined : () => onDelete?.(d)}
                    />
                ))}
            </div>
        );
    }

    return (
        <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{title}</h3>
            {renderContent()}
        </section>
    );
}
