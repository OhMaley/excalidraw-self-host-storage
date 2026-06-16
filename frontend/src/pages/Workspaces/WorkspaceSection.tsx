import styles from "./Workspaces.module.scss";

interface WorkspaceSectionProps {
    readonly icon: React.ReactNode;
    readonly title: string;
    readonly count?: number;
    readonly children: React.ReactNode;
}

export function WorkspaceSection({ icon, title, count, children }: WorkspaceSectionProps) {
    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                {icon}
                <h3>{title}</h3>
                {count !== undefined && <span>({count})</span>}
            </div>
            <div className={styles.sectionContent}>{children}</div>
        </div>
    );
}
