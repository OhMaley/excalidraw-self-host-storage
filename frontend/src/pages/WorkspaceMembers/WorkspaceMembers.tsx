import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, DropdownMenu, ScrollArea, Select, Separator } from "radix-ui";

// Hooks
import { useWorkspaceMembers } from "@hooks/useWorkspaceMembers";
import { useWorkspaces } from "@hooks/useWorkspaces";
import { useToast } from "@hooks/useToast";
import { useAuth } from "@hooks/useAuth";

// Components
import { CardMenu, cardMenuStyles } from "@components/CardMenu";
import { SearchSortToolbar } from "@components/SearchSortToolbar";
import { Spinner } from "@components/Spinner";
import { VScrollbar } from "@components/VScrollbar";
import { RemoveMemberDialog } from "./RemoveMemberDialog";
import { LeaveWorkspaceDialog } from "./LeaveWorkspaceDialog";
import { TransferOwnershipDialog } from "./TransferOwnershipDialog";

// Icons
import ExitIcon from "@assets/icons/exit.svg?react";
import PlusIcon from "@assets/icons/plus.svg?react";
import TrashIcon from "@assets/icons/trash.svg?react";

// Services
import type { WorkspaceMember } from "@services/members";

// Utils
import { getColorFromId } from "@utils/colorUtils";
import { getInitials } from "@utils/stringUtils";

// Styles
import styles from "./WorkspaceMembers.module.scss";

type SortField = "name" | "joined";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: "name", label: "Name" },
    { value: "joined", label: "Joined date" },
];

function applyFilter(members: WorkspaceMember[], query: string): WorkspaceMember[] {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.user.name.toLowerCase().includes(q));
}

function applySort(members: WorkspaceMember[], field: SortField, dir: SortDir): WorkspaceMember[] {
    const sorted = [...members].sort((a, b) => {
        if (field === "name") return a.user.name.localeCompare(b.user.name);
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    });
    return dir === "asc" ? sorted : sorted.reverse();
}

function formatJoinedAt(joinedAt: string): string {
    return new Date(joinedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

interface RoleCellProps {
    readonly member: WorkspaceMember;
    readonly canManage: boolean;
    readonly onRoleChange: (member: WorkspaceMember, role: "admin" | "member") => void;
}

function RoleCell({ member, canManage, onRoleChange }: RoleCellProps) {
    if (member.role === "owner") {
        return <span className={`${styles.roleBadge} ${styles.roleOwner}`}>Owner</span>;
    }
    if (!canManage) {
        return (
            <span className={styles.roleBadge}>{member.role === "admin" ? "Admin" : "Member"}</span>
        );
    }
    return (
        <Select.Root
            value={member.role}
            onValueChange={(v) => onRoleChange(member, v as "admin" | "member")}
        >
            <Select.Trigger className={styles.roleTrigger} aria-label="Change role">
                <Select.Value>{member.role === "admin" ? "Admin" : "Member"}</Select.Value>
                <Select.Icon className={styles.roleChevron}>▾</Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Content className={styles.selectContent} position="popper" sideOffset={4}>
                    <Select.Viewport>
                        <Select.Item value="admin" className={styles.selectItem}>
                            <Select.ItemText>Admin</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="member" className={styles.selectItem}>
                            <Select.ItemText>Member</Select.ItemText>
                        </Select.Item>
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
}

interface MemberRowActions {
    readonly canManage: boolean;
    readonly isOwnerCaller: boolean;
    readonly onRoleChange: (member: WorkspaceMember, role: "admin" | "member") => void;
    readonly onRemove: (member: WorkspaceMember) => void;
    readonly onTransfer: (member: WorkspaceMember) => void;
    readonly onLeave: () => void;
}

interface MemberRowProps extends MemberRowActions {
    readonly member: WorkspaceMember;
    readonly isSelf: boolean;
}

function MemberRow({
    member,
    isSelf,
    canManage,
    isOwnerCaller,
    onRoleChange,
    onRemove,
    onTransfer,
    onLeave,
}: MemberRowProps) {
    const avatarColor = getColorFromId(member.user.id);
    const initials = getInitials(member.user.name);
    const showLeaveMenu = isSelf && member.role !== "owner";
    const showManageMenu = !isSelf && canManage && member.role !== "owner";

    return (
        <div className={styles.row}>
            <Avatar.Root className={styles.avatar} style={{ backgroundColor: avatarColor }}>
                <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar.Root>
            <span className={styles.name}>
                {member.user.name}
                {isSelf && <span className={styles.youTag}> (You)</span>}
            </span>
            <div className={styles.roleCell}>
                <RoleCell member={member} canManage={canManage} onRoleChange={onRoleChange} />
            </div>
            <span className={styles.joinedAt}>{formatJoinedAt(member.joined_at)}</span>
            <div className={styles.rowMenu}>
                {showLeaveMenu && (
                    <CardMenu
                        label="Member options"
                        triggerClassName={styles.rowMenuTrigger}
                        iconClassName={styles.rowMenuIcon}
                        contentClassName={cardMenuStyles.content}
                    >
                        <DropdownMenu.Item
                            className={`${cardMenuStyles.item} ${cardMenuStyles.itemDelete}`}
                            onSelect={() => setTimeout(onLeave, 0)}
                        >
                            <ExitIcon className={cardMenuStyles.itemIcon} />
                            Leave workspace
                        </DropdownMenu.Item>
                    </CardMenu>
                )}
                {showManageMenu && (
                    <CardMenu
                        label="Member options"
                        triggerClassName={styles.rowMenuTrigger}
                        iconClassName={styles.rowMenuIcon}
                        contentClassName={cardMenuStyles.content}
                    >
                        {isOwnerCaller && (
                            <DropdownMenu.Item
                                className={cardMenuStyles.item}
                                onSelect={() => setTimeout(() => onTransfer(member), 0)}
                            >
                                Make owner
                            </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Item
                            className={`${cardMenuStyles.item} ${cardMenuStyles.itemDelete}`}
                            onSelect={() => setTimeout(() => onRemove(member), 0)}
                        >
                            <TrashIcon className={cardMenuStyles.itemIcon} />
                            Remove from workspace
                        </DropdownMenu.Item>
                    </CardMenu>
                )}
            </div>
        </div>
    );
}

interface MemberSectionProps extends MemberRowActions {
    readonly title: string;
    readonly members: WorkspaceMember[];
    readonly currentUserId: string | undefined;
}

function MemberSection({
    title,
    members,
    currentUserId,
    canManage,
    isOwnerCaller,
    onRoleChange,
    onRemove,
    onTransfer,
    onLeave,
}: MemberSectionProps) {
    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
                {title} ({members.length})
            </h3>
            {members.length > 0 && (
                <div className={styles.memberList}>
                    {members.map((m) => (
                        <MemberRow
                            key={m.user.id}
                            member={m}
                            isSelf={m.user.id === currentUserId}
                            canManage={canManage}
                            isOwnerCaller={isOwnerCaller}
                            onRoleChange={onRoleChange}
                            onRemove={onRemove}
                            onTransfer={onTransfer}
                            onLeave={onLeave}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface MemberSectionsProps extends MemberRowActions {
    readonly members: WorkspaceMember[];
    readonly currentUserId: string | undefined;
}

function MemberSections({ members, ...rowProps }: MemberSectionsProps) {
    const sections: [string, WorkspaceMember["role"]][] = [
        ["Owner", "owner"],
        ["Admins", "admin"],
        ["Members", "member"],
    ];
    return (
        <>
            {sections.map(([title, role]) => (
                <MemberSection
                    key={role}
                    title={title}
                    members={members.filter((m) => m.role === role)}
                    {...rowProps}
                />
            ))}
        </>
    );
}

interface MemberDialogsProps {
    readonly removeTarget: WorkspaceMember | null;
    readonly transferTarget: WorkspaceMember | null;
    readonly leaveDialogOpen: boolean;
    readonly onCloseRemove: () => void;
    readonly onCloseTransfer: () => void;
    readonly onCloseLeave: () => void;
    readonly onConfirmRemove: () => void;
    readonly onConfirmTransfer: () => void;
    readonly onConfirmLeave: () => void;
}

function MemberDialogs({
    removeTarget,
    transferTarget,
    leaveDialogOpen,
    onCloseRemove,
    onCloseTransfer,
    onCloseLeave,
    onConfirmRemove,
    onConfirmTransfer,
    onConfirmLeave,
}: MemberDialogsProps) {
    return (
        <>
            <RemoveMemberDialog
                member={removeTarget}
                onClose={onCloseRemove}
                onConfirm={onConfirmRemove}
            />
            <TransferOwnershipDialog
                member={transferTarget}
                onClose={onCloseTransfer}
                onConfirm={onConfirmTransfer}
            />
            <LeaveWorkspaceDialog
                open={leaveDialogOpen}
                onClose={onCloseLeave}
                onConfirm={onConfirmLeave}
            />
        </>
    );
}

function MembersPageHeader() {
    return (
        <div className={styles.pageHeader}>
            <h2 className={styles.pageTitle}>Team Members</h2>
            <div className={styles.headerActions}>
                <button
                    type="button"
                    className={`btn-md ${styles.addButton}`}
                    disabled
                    aria-disabled="true"
                    title="Coming soon"
                >
                    <PlusIcon className={styles.addButtonIcon} />
                    Add member
                </button>
            </div>
        </div>
    );
}

function useMembersToolbarState(members: WorkspaceMember[]) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const visibleMembers = useMemo(
        () => applySort(applyFilter(members, searchQuery), sortField, sortDir),
        [members, searchQuery, sortField, sortDir]
    );

    return {
        searchQuery,
        setSearchQuery,
        sortField,
        setSortField,
        sortDir,
        setSortDir,
        visibleMembers,
    };
}

function useMemberDialogState(
    wsId: string | undefined,
    handleRemove: (member: WorkspaceMember) => void,
    handleTransferOwnership: (member: WorkspaceMember) => void,
    handleLeave: () => Promise<void>
) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { removeWorkspace } = useWorkspaces();

    const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null);
    const [transferTarget, setTransferTarget] = useState<WorkspaceMember | null>(null);
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

    function confirmRemove() {
        if (!removeTarget) return;
        handleRemove(removeTarget);
        setRemoveTarget(null);
    }

    function confirmTransfer() {
        if (!transferTarget) return;
        handleTransferOwnership(transferTarget);
        setTransferTarget(null);
    }

    function confirmLeave() {
        if (!wsId) return;
        handleLeave()
            .then(() => {
                removeWorkspace(wsId);
                void navigate("/workspaces");
            })
            .catch(() => showToast({ title: "Failed to leave workspace", variant: "error" }));
        setLeaveDialogOpen(false);
    }

    return {
        removeTarget,
        setRemoveTarget,
        transferTarget,
        setTransferTarget,
        leaveDialogOpen,
        setLeaveDialogOpen,
        confirmRemove,
        confirmTransfer,
        confirmLeave,
    };
}

export default function WorkspaceMembers() {
    const { wsId } = useParams<{ wsId: string }>();
    const { user } = useAuth();
    const {
        members,
        myRole,
        loading,
        handleRoleChange,
        handleRemove,
        handleTransferOwnership,
        handleLeave,
    } = useWorkspaceMembers(wsId);

    const {
        removeTarget,
        setRemoveTarget,
        transferTarget,
        setTransferTarget,
        leaveDialogOpen,
        setLeaveDialogOpen,
        confirmRemove,
        confirmTransfer,
        confirmLeave,
    } = useMemberDialogState(wsId, handleRemove, handleTransferOwnership, handleLeave);

    const {
        searchQuery,
        setSearchQuery,
        sortField,
        setSortField,
        sortDir,
        setSortDir,
        visibleMembers,
    } = useMembersToolbarState(members);

    const canManage = myRole === "owner" || myRole === "admin";
    const isOwnerCaller = myRole === "owner";

    return (
        <div className={styles.container}>
            <MembersPageHeader />

            <Separator.Root className={styles.separator} />

            <SearchSortToolbar
                className={styles.toolbar}
                searchQuery={searchQuery}
                searchPlaceholder="Search members…"
                sortValue={sortField}
                sortOptions={SORT_OPTIONS}
                sortDir={sortDir}
                onSearchChange={setSearchQuery}
                onSortValueChange={setSortField}
                onSortDirToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            />

            <ScrollArea.Root className={styles.scrollRoot}>
                <ScrollArea.Viewport className={styles.scrollViewport}>
                    {loading ? (
                        <div className={styles.spinnerContainer}>
                            <Spinner size="1.5rem" />
                        </div>
                    ) : (
                        <MemberSections
                            members={visibleMembers}
                            currentUserId={user?.id}
                            canManage={canManage}
                            isOwnerCaller={isOwnerCaller}
                            onRoleChange={handleRoleChange}
                            onRemove={setRemoveTarget}
                            onTransfer={setTransferTarget}
                            onLeave={() => setLeaveDialogOpen(true)}
                        />
                    )}
                </ScrollArea.Viewport>
                <VScrollbar />
            </ScrollArea.Root>

            <MemberDialogs
                removeTarget={removeTarget}
                transferTarget={transferTarget}
                leaveDialogOpen={leaveDialogOpen}
                onCloseRemove={() => setRemoveTarget(null)}
                onCloseTransfer={() => setTransferTarget(null)}
                onCloseLeave={() => setLeaveDialogOpen(false)}
                onConfirmRemove={confirmRemove}
                onConfirmTransfer={confirmTransfer}
                onConfirmLeave={confirmLeave}
            />
        </div>
    );
}
