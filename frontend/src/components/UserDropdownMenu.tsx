// Components
import { Avatar, DropdownMenu } from "radix-ui";
import { Link } from "react-router-dom";

// Icons
import UserIcon from "../assets/icons/user.svg?react";
import GearIcon from "../assets/icons/gear.svg?react";
import ExitIcon from "../assets/icons/exit.svg?react";
import FolderIcon from "../assets/icons/folder.svg?react";

// Type
import type { User } from "@auth/AuthContext";

// Utils
import { getInitials } from "@utils/stringUtils";

// Styles
import styles from "./UserDropdownMenu.module.scss";

interface UserDropdownMenuProps {
    readonly user: User;
    readonly logout: () => void;
}

export function UserDropdownMenu({ user, logout }: UserDropdownMenuProps) {
    const initials = getInitials(user.name);
    const email = user.email ?? null;

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button className={styles.avatarButton}>
                    <Avatar.Root className={styles.avatarRoot}>
                        <Avatar.Fallback className={styles.avatarFallback}>
                            {initials}
                        </Avatar.Fallback>
                    </Avatar.Root>
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content className={styles.dropdownMenuContent} sideOffset={8}>
                    <DropdownMenu.Item className={styles.dropdownMenuItem} disabled>
                        <UserIcon className={styles.icon} />
                        My Profile
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className={styles.dropdownMenuItem} disabled>
                        <GearIcon className={styles.icon} />
                        Preferences
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator className={styles.dropdownMenuSeparator} />

                    <DropdownMenu.Item asChild>
                        <Link to="/workspaces" className={styles.dropdownMenuItem}>
                            <FolderIcon className={styles.icon} />
                            My Workspaces
                        </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator className={styles.dropdownMenuSeparator} />

                    <DropdownMenu.Item
                        className={`${styles.dropdownMenuItem} ${styles.red}`}
                        onSelect={() => logout()}
                    >
                        <ExitIcon className={`${styles.icon} ${styles.red}`} />
                        Sign out
                    </DropdownMenu.Item>
                    {email && <span className={styles.utilities}>{email}</span>}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
