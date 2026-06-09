import { useNavigate } from "react-router-dom";

import { WorkspaceSection } from "./WorkspaceSection";
import { WorkspaceCard } from "@components/WorkspaceCard";
import { Spinner } from "@components/Spinner";
import type { Workspace } from "@services/workspaces";
import LockIcon from "../../assets/icons/lock.svg?react";
import UsersIcon from "../../assets/icons/users.svg?react";
import styles from "./Workspaces.module.scss";

interface WorkspacesBodyProps {
    readonly loading: boolean;
    readonly privateWorkspaces: Workspace[];
    readonly teamWorkspaces: Workspace[];
    readonly collectionCounts: Record<string, number>;
}

export function WorkspacesBody({
    loading,
    privateWorkspaces,
    teamWorkspaces,
    collectionCounts,
}: WorkspacesBodyProps) {
    const navigate = useNavigate();

    if (loading)
        return (
            <div className={styles.center}>
                <Spinner size="2rem" />
            </div>
        );

    return (
        <div className={styles.body}>
            <WorkspaceSection icon={<LockIcon className={styles.icon} />} title="Private workspace">
                {privateWorkspaces.map((w) => (
                    <WorkspaceCard
                        key={w.id}
                        workspace={w}
                        collectionCount={collectionCounts[w.id] ?? 0}
                        onClick={() => void navigate(`/workspaces/${w.id}`)}
                    />
                ))}
            </WorkspaceSection>

            <WorkspaceSection
                icon={<UsersIcon className={styles.icon} />}
                title="Teams workspaces"
                count={teamWorkspaces.length}
            >
                {teamWorkspaces.map((w) => (
                    <WorkspaceCard
                        key={w.id}
                        workspace={w}
                        collectionCount={collectionCounts[w.id] ?? 0}
                        onClick={() => void navigate(`/workspaces/${w.id}`)}
                    />
                ))}
                {teamWorkspaces.length === 0 && (
                    <p className={styles.emptyMessage}>
                        You are not a member of any teams workspace yet.
                    </p>
                )}
            </WorkspaceSection>
        </div>
    );
}
