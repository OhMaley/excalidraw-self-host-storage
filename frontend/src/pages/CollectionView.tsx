import { useParams } from "react-router-dom";

import styles from "./CollectionView.module.scss";

export default function CollectionView() {
    const { wsId, colId } = useParams<{ wsId: string; colId: string }>();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Collection</h2>
            </div>
            <p className={styles.placeholder}>
                Workspace {wsId} / Collection {colId} — coming soon
            </p>
        </div>
    );
}
