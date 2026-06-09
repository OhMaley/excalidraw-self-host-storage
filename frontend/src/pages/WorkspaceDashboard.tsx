import { useParams } from "react-router-dom";

import styles from "./WorkspaceDashboard.module.scss";

export default function WorkspaceDashboard() {
    const { wsId } = useParams<{ wsId: string }>();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Dashboard</h2>
            </div>
            <p className={styles.placeholder}>Workspace {wsId} — coming soon</p>
        </div>
    );
}
