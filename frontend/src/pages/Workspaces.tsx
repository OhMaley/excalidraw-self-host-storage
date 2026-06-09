import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Components
import { Separator } from "radix-ui";
import { WorkspaceCard } from "@components/WorkspaceCard";
import { NewWorkspaceDialog } from "@components/NewWorkspaceDialog";
import Spinner from "@components/Spinner";

// Hooks
import { useToast } from "@hooks/useToast";

// Services
import type { Workspace } from "@services/workspaces";
import { listWorkspaces } from "@services/workspaces";
import { getCollectionCount } from "@services/collections";

// Styles
import styles from "./Workspaces.module.scss";

// Icons
import PlusIcon from "../assets/icons/plus.svg?react";
import LockIcon from "../assets/icons/lock.svg?react";
import UsersIcon from "../assets/icons/users.svg?react";

function toCountEntry(workspaceId: string): Promise<[string, number]> {
    return getCollectionCount(workspaceId).then((count): [string, number] => [workspaceId, count]);
}

interface WorkspaceSectionProps {
    readonly icon: React.ReactNode;
    readonly title: string;
    readonly count?: number;
    readonly children: React.ReactNode;
}

function WorkspaceSection({ icon, title, count, children }: WorkspaceSectionProps) {
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

interface WorkspacesBodyProps {
    readonly loading: boolean;
    readonly privateWorkspaces: Workspace[];
    readonly teamWorkspaces: Workspace[];
    readonly collectionCounts: Record<string, number>;
}

function WorkspacesBody({
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

export default function Workspaces() {
    const { showToast } = useToast();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        listWorkspaces()
            .then((ws) => {
                setWorkspaces(ws);
                return Promise.all(ws.map((w) => toCountEntry(w.id)));
            })
            .then((entries) => setCollectionCounts(Object.fromEntries(entries)))
            .catch(() => showToast({ title: "Failed to load workspaces", variant: "error" }))
            .finally(() => setLoading(false));
    }, [showToast]);

    function handleWorkspaceCreated(workspace: Workspace) {
        setWorkspaces((prev) => [...prev, workspace]);
    }

    const privateWorkspaces = workspaces.filter((w) => w.is_private);
    const teamWorkspaces = workspaces.filter((w) => !w.is_private);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Workspaces</h2>
                <button
                    className={`btn-md ${styles.headerButton}`}
                    onClick={() => setDialogOpen(true)}
                >
                    <PlusIcon className={styles.icon} />
                    New Workspace
                </button>
            </div>
            <Separator.Root className={styles.separator} />
            <WorkspacesBody
                loading={loading}
                privateWorkspaces={privateWorkspaces}
                teamWorkspaces={teamWorkspaces}
                collectionCounts={collectionCounts}
            />
            <NewWorkspaceDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onCreated={handleWorkspaceCreated}
            />
        </div>
    );
}
