// Components
import { Separator } from "radix-ui";

// Styles
import styles from "./Workspaces.module.scss";

// Icons
import PlusIcon from "../assets/icons/plus.svg?react";
import LockIcon from "../assets/icons/lock.svg?react";
import UsersIcon from "../assets/icons/users.svg?react";

interface WorkspaceSectionProps {
    readonly icon: React.ReactNode;
    readonly title: string;
    readonly count: number;
    readonly children: React.ReactNode;
}

function WorkspaceSection({ icon, title, count, children }: WorkspaceSectionProps) {
    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                {icon}
                <h3>{title}</h3>
                <span>({count})</span>
            </div>
            <div className={styles.sectionContent}>{children}</div>
        </div>
    );
}

export default function Workspaces() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Workspaces</h2>
                <button className={`btn-md ${styles.headerButton}`}>
                    <PlusIcon className={styles.icon} />
                    New Workspace
                </button>
            </div>

            <Separator.Root className={styles.separator} />

            <div className={styles.body}>
                <WorkspaceSection
                    icon={<LockIcon className={styles.icon} />}
                    title="Private workspaces"
                    count={4}
                >
                    <p>card 1</p>
                    <p>card 2</p>
                    <p>card 3</p>
                    <p>card 4</p>
                </WorkspaceSection>

                <WorkspaceSection
                    icon={<UsersIcon className={styles.icon} />}
                    title="Teams workspaces"
                    count={4}
                >
                    <p>card 1</p>
                    <p>card 2</p>
                    <p>card 3</p>
                    <p>card 4</p>
                </WorkspaceSection>
            </div>
        </div>
    );
}
