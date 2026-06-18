import { useId } from "react";
import { Select } from "radix-ui";

import type { Collection } from "@services/collections";
import styles from "./CollectionSelectField.module.scss";

export interface CollectionSelectFieldProps {
    readonly collections: Collection[];
    readonly value: string;
    readonly onChange: (id: string) => void;
    readonly disabled: boolean;
    readonly contentEl: HTMLDivElement | null;
}

export function CollectionSelectField({
    collections,
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
                Collection
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
                            {collections.map((col) => (
                                <Select.Item
                                    key={col.id}
                                    value={col.id}
                                    className={styles.selectItem}
                                >
                                    <Select.ItemText>{col.name}</Select.ItemText>
                                </Select.Item>
                            ))}
                        </Select.Viewport>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>
        </div>
    );
}
