// Components
import { Separator } from "radix-ui";

// Styles
import styles from "./Workspaces.module.scss";

// Icons
import PlusIcon from "../assets/icons/plus.svg?react";
import LockIcon from "../assets/icons/lock.svg?react";
import UsersIcon from "../assets/icons/users.svg?react";

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
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <LockIcon className={styles.icon} />
                        <h3>Private workspaces</h3>
                        <span>(4)</span>
                    </div>
                    <div className={styles.sectionContent}>
                        <p>card 1</p>
                        <p>card 2</p>
                        <p>card 3</p>
                        <p>card 4</p>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <UsersIcon className={styles.icon} />
                        <h3>Teams workspaces</h3>
                        <span>(4)</span>
                    </div>
                    <div className={styles.sectionContent}>
                        <p>card 1</p>
                        <p>card 2</p>
                        <p>card 3</p>
                        <p>card 4</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
