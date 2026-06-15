import { DropdownMenu } from "radix-ui";

import { CardMenu, cardMenuStyles } from "@components/CardMenu";
import TrashIcon from "../assets/icons/trash.svg?react";

interface WorkspaceMenuProps {
    readonly onDelete: () => void;
    readonly triggerClassName: string;
    readonly iconClassName: string;
}

export function WorkspaceMenu({ onDelete, triggerClassName, iconClassName }: WorkspaceMenuProps) {
    return (
        <CardMenu
            label="Workspace options"
            triggerClassName={triggerClassName}
            iconClassName={iconClassName}
            contentClassName={cardMenuStyles.content}
        >
            <DropdownMenu.Item
                className={`${cardMenuStyles.item} ${cardMenuStyles.itemDelete}`}
                onSelect={() => setTimeout(onDelete, 0)}
            >
                <TrashIcon className={cardMenuStyles.itemIcon} />
                Delete
            </DropdownMenu.Item>
        </CardMenu>
    );
}
