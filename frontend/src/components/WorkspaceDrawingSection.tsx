import { DrawingCard } from "@components/DrawingCard";
import Spinner from "@components/Spinner";
import { type Drawing } from "@services/drawings";
import styles from "./WorkspaceDrawingSection.module.scss";

interface WorkspaceDrawingSectionProps {
    readonly title: string;
    readonly drawings: Drawing[];
    readonly loading: boolean;
    readonly visitedAtMap?: ReadonlyMap<string, number>;
    readonly onDelete?: (drawing: Drawing) => void;
}

export function WorkspaceDrawingSection({
    title,
    drawings,
    loading,
    visitedAtMap,
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
                        to={`/draw/${d.id}`}
                        visitedAt={visitedAtMap?.get(d.id)}
                        onDelete={() => onDelete?.(d)}
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
