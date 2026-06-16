import type { ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import DotsIcon from "@assets/icons/dots.svg?react";
import styles from "./CardMenu.module.scss";

export { styles as cardMenuStyles };

interface CardMenuProps {
    readonly label: string;
    readonly triggerClassName: string;
    readonly iconClassName: string;
    readonly contentClassName: string;
    readonly children: ReactNode;
}

export function CardMenu({
    label,
    triggerClassName,
    iconClassName,
    contentClassName,
    children,
}: CardMenuProps) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button type="button" className={triggerClassName} aria-label={label}>
                    <DotsIcon className={iconClassName} />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content className={contentClassName} align="end" sideOffset={4}>
                    {children}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
