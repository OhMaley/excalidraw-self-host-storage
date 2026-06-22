import { useId } from "react";
import { Select } from "radix-ui";

import styles from "./CollectionSelectField.module.scss";

export interface CollectionSelectFieldProps {
    readonly items: { id: string; name: string }[];
    readonly label?: string;
    readonly value: string;
    readonly onChange: (id: string) => void;
    readonly disabled: boolean;
    readonly contentEl: HTMLDivElement | null;
}

export function CollectionSelectField({
    items,
    label = "Collection",
    value,
    onChange,
    disabled,
    contentEl,
}: CollectionSelectFieldProps) {
    const labelId = useId();
    const triggerId = useId();
    return (
        <div className={styles.field}>
            <label id={labelId} htmlFor={triggerId} className={styles.label}>
                {label}
            </label>
            <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
                <Select.Trigger
                    id={triggerId}
                    aria-labelledby={labelId}
                    className={styles.selectTrigger}
                >
                    <Select.Value />
                    <Select.Icon className={styles.selectIcon}>▾</Select.Icon>
                </Select.Trigger>
                <Select.Portal container={contentEl}>
                    <Select.Content
                        className={styles.selectContent}
                        position="popper"
                        sideOffset={4}
                    >
                        <Select.Viewport>
                            {items.map((item) => (
                                <Select.Item
                                    key={item.id}
                                    value={item.id}
                                    className={styles.selectItem}
                                >
                                    <Select.ItemText>{item.name}</Select.ItemText>
                                </Select.Item>
                            ))}
                        </Select.Viewport>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>
        </div>
    );
}
