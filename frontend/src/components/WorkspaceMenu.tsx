import { DropdownMenu } from "radix-ui";

import { CardMenu, cardMenuStyles } from "@components/CardMenu";
import PencilIcon from "../assets/icons/pencil.svg?react";
import TrashIcon from "../assets/icons/trash.svg?react";

interface WorkspaceMenuProps {
    readonly onEdit: () => void;
    readonly onDelete?: () => void;
    readonly triggerClassName: string;
    readonly iconClassName: string;
}

export function WorkspaceMenu({
    onEdit,
    onDelete,
    triggerClassName,
    iconClassName,
}: WorkspaceMenuProps) {
    return (
        <CardMenu
            label="Workspace options"
            triggerClassName={triggerClassName}
            iconClassName={iconClassName}
            contentClassName={cardMenuStyles.content}
        >
            <DropdownMenu.Item
                className={cardMenuStyles.item}
                onSelect={() => setTimeout(onEdit, 0)}
            >
                <PencilIcon className={cardMenuStyles.itemIcon} />
                Edit workspace
            </DropdownMenu.Item>
            {onDelete && (
                <DropdownMenu.Item
                    className={`${cardMenuStyles.item} ${cardMenuStyles.itemDelete}`}
                    onSelect={() => setTimeout(onDelete, 0)}
                >
                    <TrashIcon className={cardMenuStyles.itemIcon} />
                    Delete workspace
                </DropdownMenu.Item>
            )}
        </CardMenu>
    );
}
